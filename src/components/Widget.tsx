import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { useProviders } from "../store/useProviders";
import ProviderRow from "./ProviderRow";
import Settings from "./Settings";
import ContextMenu from "./ContextMenu";
import { formatTokens } from "../utils/format";
import "./Widget.css";

export default function Widget() {
  const { providers, overall, todayBurns, widgetState, isSyncing, loadData, setWidget } = useProviders();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    void loadData();

    // Fallback poll every 5 minutes in case the file watcher misses something
    const interval = setInterval(() => void loadData(), 5 * 60_000);

    // Primary trigger: file watcher in Rust detects JSONL changes in real time
    let unlisten: (() => void) | undefined;
    listen<void>("claude-usage-changed", () => void loadData())
      .then((fn) => { unlisten = fn; });

    return () => {
      clearInterval(interval);
      unlisten?.();
    };
  }, []);

  // Sync always-on-top with Tauri on mount
  useEffect(() => {
    void invoke("set_always_on_top", { value: widgetState.alwaysOnTop });
  }, [widgetState.alwaysOnTop]);

  if (widgetState.activeView === "settings") return <Settings />;

  const { averageRemainingPercentage, nearestReset, riskStatus } = overall;
  const overallStatus =
    averageRemainingPercentage >= 70 ? "green"
    : averageRemainingPercentage >= 40 ? "yellow"
    : "red";

  return (
    <div
      className="widget"
      style={{ opacity: widgetState.opacity }}
      onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
      onClick={() => setMenu(null)}
    >
      {/* ── Header ── */}
      <div
        className="widget__header"
        onMouseDown={(e) => {
          if (e.button === 0 && !(e.target as HTMLElement).closest("button")) {
            void getCurrentWindow().startDragging();
          }
        }}
      >
        <span className="widget__title">
          AI Fuel{isSyncing && <span className="widget__syncing">↻</span>}
        </span>
        <div className="widget__actions">
          <button
            className="widget__icon-btn"
            title="Settings"
            onClick={(e) => { e.stopPropagation(); setWidget({ activeView: "settings" }); }}
          >⚙</button>
          <button
            className="widget__icon-btn"
            title={widgetState.isExpanded ? "Collapse" : "Expand"}
            onClick={(e) => { e.stopPropagation(); setWidget({ isExpanded: !widgetState.isExpanded }); }}
          >{widgetState.isExpanded ? "▲" : "▼"}</button>
        </div>
      </div>

      {/* ── Provider bars ── */}
      <div className="widget__body">
        {providers.length === 0 ? (
          <p className="widget__loading">Loading…</p>
        ) : (
          providers.map((p) => (
            <ProviderRow
              key={p.id}
              provider={p}
              expanded={widgetState.isExpanded}
              todayTokens={todayBurns.find((b) => b.providerId === p.id)?.tokens}
            />
          ))
        )}
      </div>

      {/* ── Footer ── */}
      <div className="widget__footer">
        <div className={`widget__overall widget__overall--${overallStatus}`}>
          <span className="widget__overall-label">Overall</span>
          <span className="widget__overall-pct">{averageRemainingPercentage}%</span>
        </div>

        {todayBurns.length > 0 && (
          <div className="widget__today">
            <span>Today</span>
            <span>↑ {formatTokens(todayBurns.reduce((s, b) => s + b.tokens, 0))} tokens</span>
          </div>
        )}

        {nearestReset && (
          <div className="widget__reset">
            <span>Reset in</span>
            <span>{nearestReset.resetCountdown}</span>
          </div>
        )}

        {riskStatus !== "safe" && (
          <div className={`widget__risk widget__risk--${riskStatus}`}>
            {riskStatus === "conservation"
              ? "⚠ Conservation Mode"
              : "⚠ At Risk"}
          </div>
        )}
      </div>

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} />
      )}
    </div>
  );
}
