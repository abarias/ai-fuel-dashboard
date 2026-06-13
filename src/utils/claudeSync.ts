import { invoke } from "@tauri-apps/api/core";
import type { ClaudeUsageResult, Provider } from "../types";
import { periodStartIso } from "./calculations";
import { saveProvider, upsertUsageLog } from "./db";
import { todayPrefix } from "./format";

export interface SyncResult {
  usedAmount: number;
  todayTokens: number;
  todayMessages: number;
}

export async function syncClaudeProvider(provider: Provider): Promise<SyncResult> {
  const usage = await invoke<ClaudeUsageResult>("scan_claude_usage", {
    sinceIso:    periodStartIso(provider.resetAt, provider.resetCadence),
    todayPrefix: todayPrefix(),
  });

  // Effective tokens = input + output + cache_creation (excludes cheap cache reads)
  const periodTokens = usage.period_input + usage.period_output + usage.period_cache_creation;
  const todayTokens  = usage.today_input  + usage.today_output;
  const usedAmount   = Math.min(provider.tokensBudget, periodTokens);

  await saveProvider(provider.id, { usedAmount });
  await upsertUsageLog(
    provider.id, todayPrefix(),
    usage.today_input, usage.today_output, 0, usage.today_messages,
  );

  return { usedAmount, todayTokens, todayMessages: usage.today_messages };
}
