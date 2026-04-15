export type PlanTier = "free" | "basic" | "premium" | "enterprise";

export type ResetPeriod = "never" | "monthly" | "yearly";

export interface SubscriptionPlan {
  id: number;
  name: string;
  tier: PlanTier;
  duration_days: number;
  price: number;
  currency: string;
  max_links: number;
  max_custom_links: number;
  reset_period: ResetPeriod;
  allow_analytics: boolean;
  allow_expiry: boolean;
  allow_custom_domain: boolean;
  allow_qr_code: boolean;
}

export interface ActiveSubscription {
  id: string;
  status: "active" | "pending" | "expired" | "cancelled";
  started_at: string;
  expires_at: string;
}

export interface UsageSnapshot {
  yearMonth: string;
  linkCount: number;
  customLinkCount: number;
  remainingLinks: number | null;
  remainingCustomLinks: number | null;
}

export interface ActivePlanAccess {
  plan: SubscriptionPlan;
  subscription: ActiveSubscription | null;
  usage: UsageSnapshot;
  hasPendingPayment: boolean;
  isVip: boolean;
}
