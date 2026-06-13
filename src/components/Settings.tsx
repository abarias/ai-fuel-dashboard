import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Provider, ResetCadence } from "../types";
import { useProviders } from "../store/useProviders";
import "./Settings.css";

type FormData = {
  usedAmount:     number;
  totalAllowance: number;
  resetCadence:   ResetCadence;
  resetAt:        string;
  apiKey:         string;
};

export default function Settings() {
  const { providers, widgetState, updateProvider, setWidget } = useProviders();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>({
    usedAmount: 0, totalAllowance: 100, resetCadence: "monthly", resetAt: "", apiKey: "",
  });

  const startEdit = (p: Provider) => {
    setEditingId(p.id);
    setForm({
      usedAmount:     p.usedAmount,
      totalAllowance: p.totalAllowance,
      resetCadence:   p.resetCadence,
      resetAt:        p.resetAt.split("T")[0],
      apiKey:         p.apiKey ?? "",
    });
  };

  const commitEdit = async (id: number, p: Provider) => {
    const hasApiKey = form.apiKey.trim().length > 0;
    await updateProvider(id, {
      usedAmount:     form.usedAmount,
      totalAllowance: form.totalAllowance,
      resetCadence:   form.resetCadence,
      resetAt:        form.resetAt ? new Date(form.resetAt).toISOString() : undefined,
      apiKey:         form.apiKey.trim() || undefined,
      // Enable auto-sync for API-driven providers when a key is present
      autoSync:       p.type === "codex" ? hasApiKey : p.autoSync,
    });
    setEditingId(null);
  };

  const pct = (p: Provider) =>
    p.totalAllowance > 0
      ? Math.round(((p.totalAllowance - p.usedAmount) / p.totalAllowance) * 100)
      : 0;

  const unitLabel = (p: Provider) =>
    p.allowanceUnit === "usd" ? "USD" : p.allowanceUnit === "tokens" ? "tokens" : "";

  return (
    <div className="s-root">
      <div
        className="s-header"
        onMouseDown={(e) => {
          if (e.button === 0 && !(e.target as HTMLElement).closest("button")) {
            void getCurrentWindow().startDragging();
          }
        }}
      >
        <span className="s-title">Settings</span>
        <button className="s-close" onClick={() => setWidget({ activeView: "widget" })}>
          ✕
        </button>
      </div>

      <div className="s-body">
        <p className="s-section-label">Providers</p>

        {providers.map((p) => (
          <div key={p.id} className="s-provider">
            <div className="s-provider-row">
              <span className="s-provider-name">{p.name}</span>
              <span className="s-provider-pct">{pct(p)}% remaining</span>
              {editingId !== p.id ? (
                <button className="s-btn" onClick={() => startEdit(p)}>Edit</button>
              ) : (
                <div className="s-edit-btns">
                  <button className="s-btn s-btn--save" onClick={() => commitEdit(p.id, p)}>Save</button>
                  <button className="s-btn s-btn--cancel" onClick={() => setEditingId(null)}>✕</button>
                </div>
              )}
            </div>

            {editingId === p.id && (
              <div className="s-form">
                {/* API key — only for providers that use external APIs */}
                {p.type === "codex" && (
                  <label className="s-field">
                    <span>API Key</span>
                    <input
                      type="password"
                      placeholder="sk-..."
                      value={form.apiKey}
                      onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    />
                  </label>
                )}

                {/* Manual usage — only for non-auto-sync or token-budget providers */}
                {(!p.autoSync || p.type === "claude") && (
                  <>
                    <label className="s-field">
                      <span>Used {unitLabel(p)}</span>
                      <input
                        type="number" min={0} step={p.allowanceUnit === "usd" ? 0.01 : 1}
                        value={form.usedAmount}
                        onChange={(e) => setForm({ ...form, usedAmount: +e.target.value })}
                        disabled={p.autoSync}
                      />
                    </label>
                    <label className="s-field">
                      <span>Budget {unitLabel(p)}</span>
                      <input
                        type="number" min={1} step={p.allowanceUnit === "usd" ? 1 : 1}
                        value={form.totalAllowance}
                        onChange={(e) => setForm({ ...form, totalAllowance: +e.target.value })}
                      />
                    </label>
                  </>
                )}

                <label className="s-field">
                  <span>Cadence</span>
                  <select
                    value={form.resetCadence}
                    onChange={(e) => setForm({ ...form, resetCadence: e.target.value as ResetCadence })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
                <label className="s-field">
                  <span>Next Reset</span>
                  <input
                    type="date"
                    value={form.resetAt}
                    onChange={(e) => setForm({ ...form, resetAt: e.target.value })}
                  />
                </label>
              </div>
            )}
          </div>
        ))}

        <p className="s-section-label" style={{ marginTop: 14 }}>Widget</p>

        <label className="s-toggle">
          <span>Always on Top</span>
          <input
            type="checkbox"
            checked={widgetState.alwaysOnTop}
            onChange={(e) => setWidget({ alwaysOnTop: e.target.checked })}
          />
        </label>

        <div className="s-range">
          <span>Opacity</span>
          <input
            type="range" min={0.3} max={1} step={0.05}
            value={widgetState.opacity}
            onChange={(e) => setWidget({ opacity: +e.target.value })}
          />
          <span>{Math.round(widgetState.opacity * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
