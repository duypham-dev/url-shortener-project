import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, ArrowLeft, Home, Loader2 } from "lucide-react";
import { getPaymentResult } from "../api/payment.api";

export const PaymentResult: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<"success" | "error" | "pending">("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<{
    amount: number;
    orderId: string;
    orderInfo: string;
    planName: string;
    currency: string;
    paidAt: string;
  }>({
    amount: 0,
    orderId: "",
    orderInfo: "",
    planName: "",
    currency: "VND",
    paidAt: "",
  });

  const orderId = searchParams.get("orderId") || "";
  const fallbackStatus = searchParams.get("status") === "success" ? "success" : "error";
  const fallbackCode = searchParams.get("code") || "99";
  const fallbackMessage = searchParams.get("message") || "";

  useEffect(() => {
    let active = true;

    const hydratePaymentResult = async () => {
      if (!orderId) {
        if (!active) return;
        setStatus("error");
        setErrorMessage("Transaction code not found.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await getPaymentResult(orderId);
        if (!active) return;

        setDetails({
          orderId: response.orderId,
          amount: response.amount,
          orderInfo: response.orderInfo || "No information",
          planName: response.planName || "Unknown",
          currency: response.currency || "VND",
          paidAt: response.paidAt || "",
        });

        setStatus(response.status);

        if (response.status === "pending") {
          if (fallbackStatus === "success") {
            setErrorMessage("Transaction is being confirmed. Please wait a few seconds.");
            return;
          }

          setStatus("error");
          setErrorMessage(
            fallbackMessage ||
              (fallbackCode === "97"
                ? "Invalid transaction signature."
                : "Transaction not yet confirmed."),
          );
          return;
        }

        if (response.status !== "success") {
          setErrorMessage("Transaction incomplete or cancelled.");
          return;
        }

        setErrorMessage(null);
      } catch (error) {
        console.log("Error fetching payment result:", error);
        if (!active) return;

        // Fallback: vẫn hiển thị theo callback status do backend redirect về
        console.error("Failed to fetch payment result, using fallback status and code");
        setStatus(fallbackStatus === "success" ? "pending" : "error");
        setDetails((prev) => ({
          ...prev,
          orderId,
        }));

        if (fallbackStatus === "success") {
          setErrorMessage(
            "System is confirming payment via IPN. The result will be updated soon.",
          );
          return;
        }

        setErrorMessage(
          fallbackMessage ||
            (fallbackCode === "97"
              ? "Invalid transaction signature."
              : "Cannot verify transaction from server."),
        );
      } finally {
        if (active) setIsLoading(false);
      }
    };

    hydratePaymentResult();

    return () => {
      active = false;
    };
  }, [orderId, fallbackStatus, fallbackCode, fallbackMessage]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Verifying transaction result...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl space-y-6 text-center">
        
        {/* ICON TRẠNG THÁI */}
        <div className="flex justify-center">
          {status === "success" ? (
            <CheckCircle className="w-20 h-20 text-green-500" />
          ) : status === "pending" ? (
            <Loader2 className="w-20 h-20 text-amber-500 animate-spin" />
          ) : (
            <XCircle className="w-20 h-20 text-red-500" />
          )}
        </div>

        {/* TIÊU ĐỀ */}
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            {status === "success"
              ? "Payment successful!"
              : status === "pending"
                ? "Confirming transaction"
                : "Payment failed!"}
          </h2>
          <p className="mt-2 text-gray-500">
            {status === "success"
              ? "Thank you for upgrading your account. VIP features have been activated."
              : status === "pending"
                ? "VNPay has returned the result. The system is waiting for IPN to update the transaction."
                : "Sorry, your transaction was cancelled or an error occurred. Please try again later."}
          </p>
        </div>

        {/* BẢNG THÔNG TIN GIAO DỊCH */}
        {status !== "error" && (
          <div className="bg-gray-50 rounded-lg p-4 text-left border border-gray-100">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-sm text-gray-500">Transaction ID:</span>
              <span className="text-sm font-medium text-gray-900">{details.orderId}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-sm text-gray-500">Amount:</span>
              <span className="text-sm font-bold text-[#00a99d]">
                {details.amount} {details.currency}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-sm text-gray-500">Subscription plan:</span>
              <span className="text-sm font-medium text-gray-900">{details.planName}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-500">Description:</span>
              <span className="text-sm text-gray-900 truncate max-w-36" title={details.orderInfo}>
                {details.orderInfo}
              </span>
            </div>
          </div>
        )}

        {status === "error" && errorMessage && (
          <div className="bg-red-50 rounded-lg p-4 text-sm text-red-600 border border-red-100">
            {errorMessage}
          </div>
        )}

        {status === "pending" && errorMessage && (
          <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-700 border border-amber-100">
            {errorMessage}
          </div>
        )}

        {/* NÚT ĐIỀU HƯỚNG */}
        <div className="mt-6 flex flex-col gap-3">
          {status === "success" ? (
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center justify-center py-3 px-4 rounded-md font-medium text-white bg-[#00a99d] hover:bg-[#009188] transition-colors"
            >
              <Home className="w-5 h-5 mr-2" />
              Go to Dashboard
            </button>
          ) : status === "pending" ? (
            <>
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center py-3 px-4 rounded-md font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors"
              >
                Check again
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full flex items-center justify-center py-3 px-4 rounded-md font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Back to Dashboard
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/dashboard/upgrade")}
                className="w-full flex items-center justify-center py-3 px-4 rounded-md font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Try payment again
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full flex items-center justify-center py-3 px-4 rounded-md font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Back to Home
              </button>
            </>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default PaymentResult;