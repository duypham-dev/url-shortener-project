import React, { useEffect, useState, useCallback } from "react";
import { Check, Loader2, AlertTriangle, Crown, XCircle } from "lucide-react";
import { getSubscriptionPlans } from "../api/subscription.api";
import { cancelMySubscription } from "../api/subscription.api";
import { createPaymentUrl } from "../api/payment.api";
import { usePlanStore } from "../store/usePlanStore";
import type { SubscriptionPlan } from "../types/subscription.type";

export const Upgrade: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Current plan from global store
  const currentPlan = usePlanStore((s) => s.plan);
  const currentSubscription = usePlanStore((s) => s.subscription);
  const hasPendingPayment = usePlanStore((s) => s.hasPendingPayment);
  const fetchPlan = usePlanStore((s) => s.fetchPlan);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        // Fetch available plans and current plan in parallel
        const [plansData] = await Promise.all([
          getSubscriptionPlans(),
          fetchPlan(), // ensure current plan is loaded
        ]);
        setPlans(plansData || []);
      } catch (error) {
        console.error("Failed to fetch plans:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [fetchPlan]);

  const hasActiveSubscription =
    currentSubscription?.status === "active" &&
    currentPlan?.tier !== "free";

  const handleSelectPlan = useCallback(async (plan: SubscriptionPlan) => {
    try {
      setErrorMessage(null);
      setProcessingPlanId(plan.id);
      const data = await createPaymentUrl(plan.id, null);

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setErrorMessage("Error creating payment link");
      }
    } catch (error) {
      console.error("Payment error:", error);
      const message =
        typeof error === "object" && error && "message" in error
          ? String(error.message)
          : "Cannot connect to payment server";

      setErrorMessage(message);
    } finally {
      setProcessingPlanId(null);
    }
  }, []);

  const handleCancelSubscription = useCallback(async () => {
    try {
      setIsCancelling(true);
      setErrorMessage(null);
      await cancelMySubscription();
      setShowCancelConfirm(false);

      // Refresh plan state globally
      await fetchPlan(true);
    } catch (error) {
      console.error("Cancel error:", error);
      const message =
        typeof error === "object" && error && "message" in error
          ? String(error.message)
          : "Cannot cancel plan. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsCancelling(false);
    }
  }, [fetchPlan]);

  const paidPlans = plans.filter((plan) => Number(plan.price) > 0);

  const isCurrentPlan = (plan: SubscriptionPlan) =>
    hasActiveSubscription && currentPlan?.id === plan.id;

  const canSelectPlan = (plan: SubscriptionPlan) =>
    !hasActiveSubscription && !hasPendingPayment && !isCurrentPlan(plan);

  const getButtonLabel = (plan: SubscriptionPlan) => {
    if (processingPlanId === plan.id) return "Creating transaction...";
    if (isCurrentPlan(plan)) return "Current plan";
    if (hasActiveSubscription) return "Cancel current plan to switch";
    if (hasPendingPayment) return "Pending transaction exists";
    return `Select ${plan.name}`;
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#00a99d]" />
      </div>
    );
  }

  return (
    <div className="min-h-full py-10 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Upgrade to VIP Account
        </h2>
        <p className="mt-4 text-xl text-gray-500">
          Select a subscription plan that fits your needs to unlock great features.
        </p>
      </div>

      {/* Current plan banner */}
      {hasActiveSubscription && currentPlan && (
        <div className="mt-8 mx-auto max-w-3xl">
          <div className="rounded-xl border border-[#00a99d]/30 bg-[#e6f6f5] p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-[#00a99d]" />
                <div>
                  <p className="font-semibold text-gray-900">
                    Current plan: {currentPlan.name}
                  </p>
                  {currentSubscription && (
                    <p className="text-sm text-gray-500">
                      Expires: {new Date(currentSubscription.expires_at).toLocaleDateString("en-US")}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Cancel plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending payment warning */}
      {hasPendingPayment && !hasActiveSubscription && (
        <div className="mt-8 mx-auto max-w-3xl">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700">
              You have an incomplete payment transaction. Please wait for it to be processed or try again in a few minutes.
            </p>
          </div>
        </div>
      )}

      {/* Cancel confirmation dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              <h3 className="text-lg font-bold text-gray-900">Confirm Cancellation</h3>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to cancel the <strong>{currentPlan?.name}</strong> plan? You will be downgraded to the Free plan immediately and lose access to premium features.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={isCancelling}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Keep plan
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isCancelling}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {isCancelling ? "Canceling..." : "Hủy gói"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-16 mx-auto max-w-7xl px-0 sm:px-6 lg:px-8">
        {errorMessage && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-8">
          {paidPlans.map((plan, index) => {
            const isPopular = index === 1;
            const isCurrent = isCurrentPlan(plan);
            return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border ${
                isCurrent
                  ? "border-[#00a99d] ring-2 ring-[#00a99d]/20 shadow-xl"
                  : isPopular
                    ? "border-[#00a99d] shadow-xl md:scale-105 z-10"
                    : "border-gray-200 shadow-md"
              } bg-white p-8`}
            >
              {isCurrent && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-[#00a99d] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Current Plan
                  </span>
                </div>
              )}
              {!isCurrent && isPopular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-[#00a99d] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-4 flex items-baseline text-gray-900">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {Number(plan.price).toLocaleString()}
                  </span>
                  <span className="ml-1 text-xl font-semibold">{plan.currency}</span>
                  <span className="ml-2 text-gray-500">/ Month </span>
                </p>
                <p className="mt-4 text-sm text-gray-500">Upgrade account with suitable features</p>
                
                <ul className="mt-6 space-y-4">
                    <li className="flex">
                      <Check className="shrink-0 w-5 h-5 text-[#00a99d]" />
                      <span className="ml-3 text-gray-600 text-sm">
                        Create up to {plan.max_links === -1 ? "Unlimited" : plan.max_links} short links
                      </span>
                    </li>
                    <li className="flex">
                      <Check className="shrink-0 w-5 h-5 text-[#00a99d]" />
                      <span className="ml-3 text-gray-600 text-sm">
                        Create {plan.max_custom_links === -1 ? "Không giới hạn" : plan.max_custom_links} Custom URLs
                      </span>
                    </li>
                    <li className="flex">
                      <Check className={`shrink-0 w-5 h-5 ${plan.allow_analytics ? "text-[#00a99d]" : "text-gray-300"}`} />
                      <span className={`ml-3 text-sm ${plan.allow_analytics ? "text-gray-600" : "text-gray-400"}`}>
                        Statistics: {plan.allow_analytics ? "detailed & Access analytics" : "basic"}
                      </span>
                    </li>
                    <li className="flex">
                      <Check className={`shrink-0 w-5 h-5 ${plan.allow_expiry ? "text-[#00a99d]" : "text-gray-300"}`} />
                      <span className={`ml-3 text-sm ${plan.allow_expiry ? "text-gray-600" : "text-gray-400"}`}>
                        Set Expiry Time
                      </span>
                    </li>
                </ul>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => canSelectPlan(plan) && handleSelectPlan(plan)}
                  disabled={!canSelectPlan(plan) || processingPlanId === plan.id}
                  className={`w-full py-3 px-4 rounded-md font-medium text-center transition-colors shadow-sm ${
                    isCurrent
                      ? "bg-gray-100 text-gray-400 cursor-default"
                      : isPopular
                        ? "bg-[#00a99d] text-white hover:bg-[#009188]"
                        : "bg-[#e6f6f5] text-[#00a99d] hover:bg-[#ccece9]"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {getButtonLabel(plan)}
                </button>
              </div>
            </div>
            );
          })}
        </div>
      </div>
      
      {/* Footer info */}
      <div className="mt-16 text-center text-gray-500 text-sm">
        <p>Safe and secure payment. You can change or cancel your plan at any time.</p>
      </div>
    </div>
  );
};

export default Upgrade;
