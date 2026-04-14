export interface SubscriptionPlan {
  id: number;
  name: string;
  duration_days: number;
  price: string;
  currency: string;
  max_links: number;
  max_custom_links: number;
  allow_analytics: boolean;
  allow_expiry: boolean;
}
