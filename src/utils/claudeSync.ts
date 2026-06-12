import { invoke } from "@tauri-apps/api/core";
import type { ClaudeUsageResult, Provider } from "../types";
import { saveProvider, upsertUsageLog } from "./db";
import { todayPrefix } from "./format";

export interface SyncResult {
  usedAmount: number;
  todayTokens: number;
  todayMessages: number;
}

/**
 * Derive the start of the current billing period from the next reset date.
 * e.g. reset_at = 2026-07-01 + monthly cadence → period started 2026-06-01.
 */
function periodStartIso(provider: Provider): string {
  const next = new Date(provider.resetAt);
  switch (provider.resetCadence) {
    case "monthly": next.setMonth(next.getMonth() - 1); break;
    case "weekly":  next.setDate(next.getDate() - 7);   break;
    case "daily":   next.setDate(next.getDate() - 1);   break;
    // "custom": fall through — scan from epoch so nothing is missed
    default:        return new Date(0).toISOString();
  }
  return next.toISOString();
}

export async function syncClaudeProvider(provider: Provider): Promise<SyncResult> {
  const usage = await invoke<ClaudeUsageResult>("scan_claude_usage", {
    sinceIso:    periodStartIso(provider),  // start of current period, not next reset
    todayPrefix: todayPrefix(),
  });

  // Effective tokens = input + output + cache_creation (excludes cheap cache reads)
  const periodTokens = usage.period_input + usage.period_output + usage.period_cache_creation;
  const todayTokens  = usage.today_input  + usage.today_output;

  const usedAmount = Math.min(provider.tokensBudget, periodTokens);

  await saveProvider(provider.id, { usedAmount });

  await upsertUsageLog(
    provider.id,
    todayPrefix(),
    usage.today_input,
    usage.today_output,
    0,
    usage.today_messages,
  );

  return { usedAmount, todayTokens, todayMessages: usage.today_messages };
}
