/**
 * usePlanStore.ts
 *
 * Global Zustand store for subscription plan data.
 * Fetched once on dashboard entry, shared across Header, Dashboard, Analytics.
 * Prevents redundant API calls on page navigation within the dashboard.
 */
import { create } from "zustand";
import { getMyPlanAccess } from "../api/subscription.api";
import type {
  SubscriptionPlan,
  ActiveSubscription,
  UsageSnapshot,
} from "../types/subscription.type";

export interface PlanState {
  // Raw data from API
  plan: SubscriptionPlan | null;
  subscription: ActiveSubscription | null;
  usage: UsageSnapshot | null;
  hasPendingPayment: boolean;

  // Loading flags
  isLoaded: boolean;
  isLoading: boolean;

  // Actions
  fetchPlan: (force?: boolean) => Promise<void>;
  refreshUsage: () => Promise<void>;
  reset: () => void;
}

// Derived selectors (computed outside store to avoid re-renders)
export const selectIsVip = (s: PlanState) =>
  s.plan !== null && s.plan.tier !== "free";
export const selectPlanName = (s: PlanState) => s.plan?.name ?? "Free";
export const selectRemainingLinks = (s: PlanState) =>
  s.usage?.remainingLinks ?? null;

const initialState = {
  plan: null,
  subscription: null,
  usage: null,
  hasPendingPayment: false,
  isLoaded: false,
  isLoading: false,
};

export const usePlanStore = create<PlanState>((set, get) => ({
  ...initialState,

  fetchPlan: async (force = false) => {
    const state = get();
    // Skip if already loaded and not forced
    if (state.isLoaded && !force) return;
    // Skip if already fetching
    if (state.isLoading) return;

    set({ isLoading: true });
    try {
      const data = await getMyPlanAccess();
      set({
        plan: data.plan,
        subscription: data.subscription,
        usage: data.usage,
        hasPendingPayment: data.hasPendingPayment,
        isLoaded: true,
      });
    } catch (error) {
      console.error("Failed to fetch plan access:", error);
      // Mark as loaded even on error to prevent infinite retry loops
      set({ isLoaded: true });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshUsage: async () => {
    // Targeted refresh: re-fetch plan data to get updated usage/quota
    // Called after link creation — always forces a fresh fetch
    set({ isLoading: true });
    try {
      const data = await getMyPlanAccess();
      set({
        plan: data.plan,
        subscription: data.subscription,
        usage: data.usage,
        hasPendingPayment: data.hasPendingPayment,
      });
    } catch (error) {
      console.error("Failed to refresh usage:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () => {
    set(initialState);
  },
}));
