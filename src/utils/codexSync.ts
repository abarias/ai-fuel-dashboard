import type { Provider } from "../types";
import { periodStartIso } from "./calculations";
import { saveProvider } from "./db";
import { todayPrefix } from "./format";

export interface CodexSyncResult {
  usedAmount: number;  // dollars used this period
  totalAllowance: number;  // hard limit in dollars
}

export async function syncCodexProvider(provider: Provider): Promise<CodexSyncResult> {
  const apiKey = provider.apiKey;
  if (!apiKey) throw new Error("No OpenAI API key configured");

  const start = periodStartIso(provider.resetAt, provider.resetCadence).slice(0, 10);
  const end   = todayPrefix();

  const headers = { Authorization: `Bearer ${apiKey}` };

  const [usageRes, subRes] = await Promise.all([
    fetch(`https://api.openai.com/dashboard/billing/usage?start_date=${start}&end_date=${end}`, { headers }),
    fetch("https://api.openai.com/dashboard/billing/subscription", { headers }),
  ]);

  if (!usageRes.ok) throw new Error(`OpenAI usage API error: ${usageRes.status}`);
  if (!subRes.ok)   throw new Error(`OpenAI subscription API error: ${subRes.status}`);

  const usage = await usageRes.json() as { total_usage?: number };
  const sub   = await subRes.json()   as { hard_limit_usd?: number; system_hard_limit_usd?: number };

  const usedDollars  = (usage.total_usage ?? 0) / 100;
  const limitDollars = sub.hard_limit_usd ?? sub.system_hard_limit_usd ?? provider.totalAllowance;

  await saveProvider(provider.id, {
    usedAmount:     usedDollars,
    totalAllowance: limitDollars,
  });

  return { usedAmount: usedDollars, totalAllowance: limitDollars };
}
