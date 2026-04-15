import React, { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { getSubscriptionPlans } from "../api/subscription.api";
import { createPaymentUrl } from "../api/payment.api";
import type { SubscriptionPlan } from "../types/subscription.type";

export const Upgrade: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const plansData = await getSubscriptionPlans();
        setPlans(plansData || []);
      } catch (error) {
        console.error("Failed to fetch plans:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    try {
      setErrorMessage(null);
      setProcessingPlanId(plan.id);
      const data = await createPaymentUrl(plan.id, null);

      if (data.paymentUrl) {
        // Redirect browser to VNPay securely
        window.location.href = data.paymentUrl;
      } else {
        setErrorMessage("Có lỗi xảy ra khi tạo link thanh toán");
      }
    } catch (error) {
      console.error("Payment error:", error);
      const message =
        typeof error === "object" && error && "message" in error
          ? String(error.message)
          : "Không thể kết nối đến máy chủ thanh toán";

      setErrorMessage(message);
    } finally {
      setProcessingPlanId(null);
    }
  };

  const paidPlans = plans.filter((plan) => Number(plan.price) > 0);

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
          Nâng cấp tài khoản VIP
        </h2>
        <p className="mt-4 text-xl text-gray-500">
          Chọn gói đăng ký phù hợp với nhu cầu của bạn để mở khóa các tính năng tuyệt vời.
        </p>
      </div>

      <div className="mt-16 mx-auto max-w-7xl px-0 sm:px-6 lg:px-8">
        {errorMessage && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-8">
          {paidPlans.map((plan, index) => {
            const isPopular = index === 1;
            return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border ${
                isPopular
                  ? "border-[#00a99d] shadow-xl md:scale-105 z-10"
                  : "border-gray-200 shadow-md"
              } bg-white p-8`}
            >
              {isPopular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-[#00a99d] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Phổ Biến Nhất
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
                  <span className="ml-2 text-gray-500">/ Tháng </span>
                </p>
                <p className="mt-4 text-sm text-gray-500">Nâng cấp tài khoản với tính năng phù hợp</p>
                
                <ul className="mt-6 space-y-4">
                    <li className="flex">
                      <Check className="shrink-0 w-5 h-5 text-[#00a99d]" />
                      <span className="ml-3 text-gray-600 text-sm">
                        Tạo tối đa {plan.max_links === -1 ? "Không giới hạn" : plan.max_links} link rút gọn
                      </span>
                    </li>
                    <li className="flex">
                      <Check className="shrink-0 w-5 h-5 text-[#00a99d]" />
                      <span className="ml-3 text-gray-600 text-sm">
                        Được tạo {plan.max_custom_links === -1 ? "Không giới hạn" : plan.max_custom_links} link Tùy chỉnh (Custom URLs)
                      </span>
                    </li>
                    <li className="flex">
                      <Check className={`shrink-0 w-5 h-5 ${plan.allow_analytics ? "text-[#00a99d]" : "text-gray-300"}`} />
                      <span className={`ml-3 text-sm ${plan.allow_analytics ? "text-gray-600" : "text-gray-400"}`}>
                        Thống kê {plan.allow_analytics ? "chi tiết & Phân tích truy cập" : "cơ bản"}
                      </span>
                    </li>
                    <li className="flex">
                      <Check className={`shrink-0 w-5 h-5 ${plan.allow_expiry ? "text-[#00a99d]" : "text-gray-300"}`} />
                      <span className={`ml-3 text-sm ${plan.allow_expiry ? "text-gray-600" : "text-gray-400"}`}>
                        Cài đặt thời gian hết hạn (Expiry)
                      </span>
                    </li>
                </ul>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={processingPlanId === plan.id}
                  className={`w-full py-3 px-4 rounded-md font-medium text-center transition-colors shadow-sm ${
                    isPopular
                      ? "bg-[#00a99d] text-white hover:bg-[#009188]"
                      : "bg-[#e6f6f5] text-[#00a99d] hover:bg-[#ccece9]"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {processingPlanId === plan.id ? "Đang tạo giao dịch..." : `Chọn ${plan.name}`}
                </button>
              </div>
            </div>
            );
          })}
        </div>
      </div>
      
      {/* FAQ or Info Section could be added here in the future */}
      <div className="mt-16 text-center text-gray-500 text-sm">
        <p>Thanh toán an toàn, bảo mật. Bạn có thể thay đổi hoặc hủy gói bất cứ lúc nào.</p>
      </div>
    </div>
  );
};

export default Upgrade;
