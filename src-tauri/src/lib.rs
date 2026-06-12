use std::fs;
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

// ── Claude usage scanner ──────────────────────────────────────────────────────

#[derive(serde::Serialize, Default)]
pub struct ClaudeUsageResult {
    pub period_input: u64,
    pub period_output: u64,
    pub period_cache_creation: u64,
    pub period_cache_read: u64,
    pub period_messages: u64,
    pub today_input: u64,
    pub today_output: u64,
    pub today_messages: u64,
}

/// Scan ~/.claude/projects/**/*.jsonl for token usage.
/// `since_iso`    – ISO-8601 datetime; only entries >= this are counted.
/// `today_prefix` – "YYYY-MM-DD"; entries whose timestamp starts with this go
///                  into the today_* fields as well.
#[tauri::command]
fn scan_claude_usage(since_iso: String, today_prefix: String) -> Result<ClaudeUsageResult, String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map(std::path::PathBuf::from)
        .map_err(|_| "Cannot determine home directory")?;

    let projects_dir = home.join(".claude").join("projects");
    if !projects_dir.exists() {
        return Ok(ClaudeUsageResult::default());
    }

    let mut result = ClaudeUsageResult::default();

    let project_entries = fs::read_dir(&projects_dir).map_err(|e| e.to_string())?;

    for pe in project_entries {
        let project_path = match pe {
            Ok(e) => e.path(),
            Err(_) => continue,
        };
        if !project_path.is_dir() {
            continue;
        }

        let session_entries = match fs::read_dir(&project_path) {
            Ok(r) => r,
            Err(_) => continue,
        };

        for se in session_entries {
            let session_path = match se {
                Ok(e) => e.path(),
                Err(_) => continue,
            };
            if session_path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
                continue;
            }

            let content = match fs::read_to_string(&session_path) {
                Ok(c) => c,
                Err(_) => continue,
            };

            for line in content.lines() {
                if line.is_empty() {
                    continue;
                }
                let obj: serde_json::Value = match serde_json::from_str(line) {
                    Ok(v) => v,
                    Err(_) => continue,
                };

                if obj.get("type").and_then(|t| t.as_str()) != Some("assistant") {
                    continue;
                }

                let ts = obj
                    .get("timestamp")
                    .and_then(|t| t.as_str())
                    .unwrap_or("");

                // Skip entries before the reset date (lexicographic ISO compare)
                if !ts.is_empty() && ts < since_iso.as_str() {
                    continue;
                }

                let usage = match obj
                    .get("message")
                    .and_then(|m| m.get("usage"))
                {
                    Some(u) => u,
                    None => continue,
                };

                let get = |key: &str| {
                    usage.get(key).and_then(|v| v.as_u64()).unwrap_or(0)
                };

                let input           = get("input_tokens");
                let output          = get("output_tokens");
                let cache_creation  = get("cache_creation_input_tokens");
                let cache_read      = get("cache_read_input_tokens");

                result.period_input           += input;
                result.period_output          += output;
                result.period_cache_creation  += cache_creation;
                result.period_cache_read      += cache_read;
                result.period_messages        += 1;

                if ts.starts_with(today_prefix.as_str()) {
                    result.today_input    += input;
                    result.today_output   += output;
                    result.today_messages += 1;
                }
            }
        }
    }

    Ok(result)
}

// ── Window helpers ────────────────────────────────────────────────────────────

#[tauri::command]
fn set_always_on_top(window: tauri::WebviewWindow, value: bool) -> Result<(), String> {
    window.set_always_on_top(value).map_err(|e| e.to_string())
}

// ── Entry point ───────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let win = app.get_webview_window("main").unwrap();
            win.set_always_on_top(true)?;

            TrayIconBuilder::new()
                .tooltip("AI Fuel Dashboard")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            if w.is_visible().unwrap_or(false) {
                                let _ = w.hide();
                            } else {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![set_always_on_top, scan_claude_usage])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
