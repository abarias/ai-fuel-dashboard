export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function todayPrefix(): string {
  return new Date().toISOString().slice(0, 10);
}
