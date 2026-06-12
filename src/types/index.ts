export type ResetCadence = "daily" | "weekly" | "monthly" | "custom";
export type ProviderType = "claude" | "codex" | "copilot";
export type AllowanceUnit = "tokens" | "requests" | "messages" | "compute" | "normalized";
export type StatusColor = "green" | "yellow" | "red";
export type RiskStatus = "safe" | "at-risk" | "conservation";
export type ActiveView = "widget" | "settings";

export interface Provider {
  id: number;
  name: string;
  type: ProviderType;
  allowanceUnit: AllowanceUnit;
  totalAllowance: number;
  usedAmount: number;
  resetCadence: ResetCadence;
  resetAt: string;
  lastUpdatedAt: string;
  notes?: string;
  autoSync: boolean;
  tokensBudget: number;
}

export interface ProviderComputed extends Provider {
  usedPercentage: number;
  remainingPercentage: number;
  status: StatusColor;
  resetCountdown: string;
  estimatedRemainingActions: number;
}

export interface OverallHealth {
  averageRemainingPercentage: number;
  lowestProvider: ProviderComputed | null;
  nearestReset: ProviderComputed | null;
  riskStatus: RiskStatus;
}

export interface WidgetState {
  opacity: number;
  isExpanded: boolean;
  alwaysOnTop: boolean;
  activeView: ActiveView;
}

export interface ClaudeUsageResult {
  period_input: number;
  period_output: number;
  period_cache_creation: number;
  period_cache_read: number;
  period_messages: number;
  today_input: number;
  today_output: number;
  today_messages: number;
}

export interface TodayBurn {
  providerId: number;
  providerName: string;
  tokens: number;
  messages: number;
}

export interface DailyLog {
  date: string;
  tokensIn: number;
  tokensOut: number;
  messages: number;
}
