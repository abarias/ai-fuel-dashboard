import type { Provider, ProviderComputed, OverallHealth, StatusColor, RiskStatus } from "../types";

export function computeProvider(provider: Provider): ProviderComputed {
  // For token-based providers, budget = tokensBudget; otherwise totalAllowance
  const budget =
    provider.allowanceUnit === "tokens"
      ? provider.tokensBudget
      : provider.totalAllowance;

  const usedPct =
    budget > 0 ? Math.min(100, (provider.usedAmount / budget) * 100) : 0;
  const remainingPercentage = Math.max(0, 100 - usedPct);

  const status: StatusColor =
    remainingPercentage >= 70 ? "green" : remainingPercentage >= 40 ? "yellow" : "red";

  const resetCountdown = formatCountdown(new Date(provider.resetAt));

  const estimatedRemainingActions = Math.round(
    (remainingPercentage / 100) * budget
  );

  return {
    ...provider,
    usedPercentage: Math.round(usedPct),
    remainingPercentage: Math.round(remainingPercentage),
    status,
    resetCountdown,
    estimatedRemainingActions,
  };
}

export function formatCountdown(resetDate: Date): string {
  const diffMs = resetDate.getTime() - Date.now();
  if (diffMs <= 0) return "Resetting…";

  const days = Math.floor(diffMs / 86_400_000);
  const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function computeOverallHealth(providers: ProviderComputed[]): OverallHealth {
  if (providers.length === 0) {
    return { averageRemainingPercentage: 0, lowestProvider: null, nearestReset: null, riskStatus: "safe" };
  }

  const avg = providers.reduce((s, p) => s + p.remainingPercentage, 0) / providers.length;

  const lowest = providers.reduce((min, p) =>
    p.remainingPercentage < min.remainingPercentage ? p : min
  );

  const nearest = [...providers].sort(
    (a, b) => new Date(a.resetAt).getTime() - new Date(b.resetAt).getTime()
  )[0];

  const riskStatus: RiskStatus = avg >= 70 ? "safe" : avg >= 40 ? "at-risk" : "conservation";

  return {
    averageRemainingPercentage: Math.round(avg),
    lowestProvider: lowest,
    nearestReset: nearest,
    riskStatus,
  };
}
