import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Provider, ProviderComputed, OverallHealth, WidgetState, TodayBurn } from "../types";
import { loadProviders, saveProvider } from "../utils/db";
import { computeProvider, computeOverallHealth } from "../utils/calculations";
import { syncClaudeProvider } from "../utils/claudeSync";

interface Store {
  providers: ProviderComputed[];
  overall: OverallHealth;
  todayBurns: TodayBurn[];
  widgetState: WidgetState;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;

  loadData: () => Promise<void>;
  updateProvider: (id: number, updates: Partial<Provider>) => Promise<void>;
  setWidget: (updates: Partial<WidgetState>) => void;
}

const defaultOverall: OverallHealth = {
  averageRemainingPercentage: 0,
  lowestProvider: null,
  nearestReset: null,
  riskStatus: "safe",
};

const defaultWidget: WidgetState = {
  opacity: 0.92,
  isExpanded: true,
  alwaysOnTop: true,
  activeView: "widget",
};

export const useProviders = create<Store>()(
  persist(
    (set, get) => ({
      providers: [],
      overall: defaultOverall,
      todayBurns: [],
      widgetState: defaultWidget,
      isLoading: false,
      isSyncing: false,
      error: null,

      loadData: async () => {
        set({ isLoading: true, error: null });
        try {
          const raw = await loadProviders();

          // Run auto-sync for providers that support it (non-blocking parallel)
          const todayBurns: TodayBurn[] = [];
          set({ isSyncing: true });

          await Promise.all(
            raw.map(async (p) => {
              if (!p.autoSync) return;
              try {
                const result = await syncClaudeProvider(p);
                p.usedAmount = result.usedAmount;
                todayBurns.push({
                  providerId:   p.id,
                  providerName: p.name,
                  tokens:       result.todayTokens,
                  messages:     result.todayMessages,
                });
              } catch (e) {
                console.warn(`Sync failed for ${p.name}:`, e);
              }
            })
          );

          const computed = raw.map(computeProvider);
          set({
            providers: computed,
            overall: computeOverallHealth(computed),
            todayBurns,
            isLoading: false,
            isSyncing: false,
          });
        } catch (e) {
          set({ error: String(e), isLoading: false, isSyncing: false });
        }
      },

      updateProvider: async (id, updates) => {
        await saveProvider(id, updates);
        await get().loadData();
      },

      setWidget: (updates) =>
        set((s) => ({ widgetState: { ...s.widgetState, ...updates } })),
    }),
    {
      name: "ai-fuel-widget-state",
      partialize: (s) => ({ widgetState: s.widgetState }),
    }
  )
);
