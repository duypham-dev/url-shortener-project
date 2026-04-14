import type { Request, Response } from "express";
import qs from "qs";
import {
  generateVnPayUrl,
  verifyVnPayReturn,
} from "../services/payment.service.js";
import type { VnpParams } from "../services/payment.service.js";

export const createPaymentUrl = (req: Request, res: Response) => {
  process.env.TZ = "Asia/Ho_Chi_Minh";

  const rawIpAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  let ipAddr = Array.isArray(rawIpAddr)
    ? rawIpAddr[0]
    : typeof rawIpAddr === "string"
    ? rawIpAddr.split(",")[0]
    : "127.0.0.1";
  if (ipAddr === "::1") ipAddr = "127.0.0.1";

  const amount = parseInt(req.body.amount, 10);
  const bankCode = req.body.bankCode;
  const locale = req.body.language;

  try {
    const paymentUrl = generateVnPayUrl(amount, bankCode, locale, ipAddr as string);
    res.status(200).json({ paymentUrl });
  } catch (error) {
    console.error("VNPAY Generate URL Error:", error);
    res.status(500).json({ message: "Lỗi kết nối VNPay" });
  }
};

export const vnpayReturn = (req: Request, res: Response) => {
  const vnp_Params = req.query as unknown as VnpParams;
  
  // Clone object để không ảnh hưởng dữ liệu gốc khi stringify
  const vnp_Params_Clone = { ...vnp_Params }; 
  const isValid = verifyVnPayReturn(vnp_Params);

  if (isValid) {
    // TODO: Kiểm tra xem dữ liệu trong DB có hợp lệ (Tình trạng đơn hàng, Số tiền) rồi cập nhật trạng thái
    const redirectUrl = `http://localhost:5173/payment-success?` + qs.stringify(vnp_Params_Clone, { encode: false });
    res.redirect(redirectUrl);
  } else {
    const redirectUrlError = `http://localhost:5173/payment-success?vnp_ResponseCode=97&` + qs.stringify(vnp_Params_Clone, { encode: false });
    res.redirect(redirectUrlError);
  }
};

export const vnpayIpn = (req: Request, res: Response) => {
  const vnp_Params = req.query as unknown as VnpParams;
  
  // Try-catch chống lỗi IPN nếu params nil
  try {
    const isValid = verifyVnPayReturn(vnp_Params);

    if (isValid) {
      const orderId = vnp_Params["vnp_TxnRef"];
      const rspCode = vnp_Params["vnp_ResponseCode"];
      // TODO: Kiểm tra dữ liệu hợp lệ: 
      // 1. Mã đơn hàng (orderId) có tồn tại trong DB không
      // 2. Chữ ký hợp lệ, số tiền (vnp_Amount / 100) có khớp DB chưa
      // 3. Trạng thái (payment_status) đơn hàng đang chờ không
      res.status(200).json({ RspCode: "00", Message: "Confirm Success" });
    } else {
      res.status(200).json({ RspCode: "97", Message: "Fail checksum" });
    }
  } catch (err) {
      console.error("IPN verify failed", err);
      res.status(200).json({ RspCode: "99", Message: "Unknown error" });
  }
};
