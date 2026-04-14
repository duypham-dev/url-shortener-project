import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, ArrowLeft, Home } from "lucide-react";

export const PaymentResult: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [details, setDetails] = useState({
    amount: 0,
    orderId: "",
    orderInfo: "",
  });

  // Lấy các tham số từ URL do VNPay trả về
  const responseCode = searchParams.get("vnp_ResponseCode");
  const amountStr = searchParams.get("vnp_Amount");
  const txnRef = searchParams.get("vnp_TxnRef");
  const orderInfo = searchParams.get("vnp_OrderInfo");

  // Derive status từ URL parameters
  const status: "success" | "error" = responseCode === "00" ? "success" : "error";

  useEffect(() => {
    if (responseCode) {
      // Lưu lại thông tin để hiển thị (Tiền của VNPay nhân 100 nên phải chia lại)
      setDetails({
        amount: amountStr ? parseInt(amountStr, 10) / 100 : 0,
        orderId: txnRef || "Không rõ",
        orderInfo: orderInfo || "Không có thông tin",
      });
    }
  }, [responseCode, amountStr, txnRef, orderInfo]);

  if (!responseCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Đang xử lý kết quả giao dịch...</p>
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
          ) : (
            <XCircle className="w-20 h-20 text-red-500" />
          )}
        </div>

        {/* TIÊU ĐỀ */}
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            {status === "success" ? "Thanh toán thành công!" : "Giao dịch thất bại!"}
          </h2>
          <p className="mt-2 text-gray-500">
            {status === "success" 
              ? "Cảm ơn bạn đã nâng cấp tài khoản. Các tính năng VIP đã được kích hoạt."
              : "Rất tiếc, giao dịch của bạn đã bị hủy hoặc có lỗi xảy ra. Vui lòng thử lại sau."}
          </p>
        </div>

        {/* BẢNG THÔNG TIN GIAO DỊCH */}
        {status === "success" && (
          <div className="bg-gray-50 rounded-lg p-4 text-left border border-gray-100">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-sm text-gray-500">Mã giao dịch:</span>
              <span className="text-sm font-medium text-gray-900">{details.orderId}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-sm text-gray-500">Số tiền:</span>
              <span className="text-sm font-bold text-[#00a99d]">
                {details.amount.toLocaleString()} VNĐ
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-500">Nội dung:</span>
              <span className="text-sm text-gray-900 truncate max-w-[150px]" title={details.orderInfo}>
                {details.orderInfo}
              </span>
            </div>
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
              Đến trang quản lý (Dashboard)
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/upgrade")}
                className="w-full flex items-center justify-center py-3 px-4 rounded-md font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Thử thanh toán lại
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full flex items-center justify-center py-3 px-4 rounded-md font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Về trang chủ
              </button>
            </>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default PaymentResult;