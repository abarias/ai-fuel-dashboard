import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { listen } from "@tauri-apps/api/event";
import { useProviders } from "../store/useProviders";
import "./PillWidget.css";

const PILL_W = 200;
const PILL_H = 34;
const FULL_W = 270;
const FULL_H = 310;

export default function PillWidget() {
  const { providers, overall, loadData, setWidget, widgetState } = useProviders();

  useEffect(() => {
    void getCurrentWindow().setSize(new LogicalSize(PILL_W, PILL_H));
    void loadData();
    const interval = setInterval(() => void loadData(), 5 * 60_000);
    let unlisten: (() => void) | undefined;
    listen<void>("claude-usage-changed", () => void loadData())
      .then((fn) => { unlisten = fn; });
    return () => { clearInterval(interval); unlisten?.(); };
  }, []);

  const expand = () => {
    setWidget({ viewMode: "full" });
    void getCurrentWindow().setSize(new LogicalSize(FULL_W, FULL_H));
  };

  const { averageRemainingPercentage, riskStatus } = overall;
  const statusColor =
    averageRemainingPercentage >= 70 ? "#4ade80"
    : averageRemainingPercentage >= 40 ? "#facc15"
    : "#f87171";

  return (
    <div
      className="pill"
      style={{ opacity: widgetState.opacity }}
      onClick={expand}
      onMouseDown={(e) => {
        if (e.button === 0) void getCurrentWindow().startDragging();
      }}
    >
      <span className="pill__dot" style={{ background: statusColor }} />
      <span className="pill__label">AI</span>
      <span className="pill__pct" style={{ color: statusColor }}>
        {averageRemainingPercentage}%
      </span>

      {providers.length > 0 && (
        <span className="pill__providers">
          {providers.map((p) => {
            const color =
              p.remainingPercentage >= 70 ? "#4ade80"
              : p.remainingPercentage >= 40 ? "#facc15"
              : "#f87171";
            return (
              <span key={p.id} className="pill__provider-dot" style={{ background: color }} title={`${p.name}: ${p.remainingPercentage}%`} />
            );
          })}
        </span>
      )}

      {riskStatus !== "safe" && (
        <span className="pill__warn">⚠</span>
      )}

      <span className="pill__expand">↗</span>
    </div>
  );
}
