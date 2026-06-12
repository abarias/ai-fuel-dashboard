import type { ProviderComputed } from "../types";
import { formatTokens } from "../utils/format";
import "./ProviderRow.css";

const ICONS: Record<string, string> = {
  claude:  "◆",
  codex:   "◉",
  copilot: "◈",
};

interface Props {
  provider: ProviderComputed;
  expanded: boolean;
  todayTokens?: number;
}

export default function ProviderRow({ provider, expanded, todayTokens }: Props) {
  const { remainingPercentage, status, resetCountdown } = provider;
  const icon = ICONS[provider.type] ?? "●";
  const isTokenBased = provider.allowanceUnit === "tokens";

  return (
    <div className={`prow prow--${status}`}>
      <div className="prow__top">
        <span className="prow__icon">{icon}</span>
        <span className="prow__name">
          {provider.name}
          {provider.autoSync && <span className="prow__auto-badge">auto</span>}
        </span>
        <span className="prow__pct">{remainingPercentage}%</span>
      </div>
      <div className="prow__bar-wrap">
        <div className="prow__bar">
          <div
            className={`prow__fill prow__fill--${status}`}
            style={{ width: `${remainingPercentage}%` }}
          />
        </div>
      </div>
      {expanded && (
        <>
          {isTokenBased && (
            <div className="prow__detail">
              <span className="prow__detail-label">Used</span>
              <span className="prow__detail-val">
                {formatTokens(provider.usedAmount)} / {formatTokens(provider.tokensBudget)} tokens
              </span>
            </div>
          )}
          <div className="prow__detail">
            <span className="prow__detail-label">Reset in</span>
            <span className="prow__detail-val">{resetCountdown}</span>
          </div>
          {todayTokens !== undefined && todayTokens > 0 && (
            <div className="prow__detail">
              <span className="prow__detail-label">Today</span>
              <span className="prow__detail-val">↑ {formatTokens(todayTokens)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
