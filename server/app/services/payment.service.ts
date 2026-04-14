import moment from "moment";
import config from "config";
import qs from "qs";
import crypto from "crypto";


export interface VnpParams {
  [key: string]: string | number;
}

// Hàm tạo URL thanh toán VNPay
export const generateVnPayUrl = (
  amount: number,
  bankCode: string | undefined, // undefined || null || empty string đều được xử lý
  locale: string | undefined,
  ipAddr: string
): string => {
  const date = new Date();
  const createDate = moment(date).format("YYYYMMDDHHmmss");

  const tmnCode = config.get("vnp_TmnCode") as string;
  const secretKey = config.get("vnp_HashSecret") as string;
  let vnpUrl = config.get("vnp_Url") as string;
  const returnUrl = config.get("vnp_ReturnUrl") as string;
  const orderId = moment(date).format("DDHHmmss");

  const lang = !locale || locale === "" ? "vn" : locale;
  const currCode = "VND";
  let vnp_Params: VnpParams = {};

  vnp_Params["vnp_Version"] = "2.1.0";
  vnp_Params["vnp_Command"] = "pay";
  vnp_Params["vnp_TmnCode"] = tmnCode;
  vnp_Params["vnp_Locale"] = lang;
  vnp_Params["vnp_CurrCode"] = currCode;
  vnp_Params["vnp_TxnRef"] = orderId;
  vnp_Params["vnp_OrderInfo"] = "Thanh toan don hang " + orderId;
  vnp_Params["vnp_OrderType"] = "other";
  vnp_Params["vnp_Amount"] = amount * 100;
  vnp_Params["vnp_ReturnUrl"] = returnUrl;
  vnp_Params["vnp_IpAddr"] = ipAddr;
  vnp_Params["vnp_CreateDate"] = createDate;

  if (bankCode) {
    vnp_Params["vnp_BankCode"] = bankCode;
  }

  vnp_Params = sortObject(vnp_Params);

  const signData = qs.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  vnp_Params["vnp_SecureHash"] = signed;
  vnpUrl += "?" + qs.stringify(vnp_Params, { encode: false });

  return vnpUrl;
};

// Hàm xác thực dữ liệu trả về từ VNPay
export const verifyVnPayReturn = (vnp_Params: VnpParams): boolean => {
  const secureHash = vnp_Params["vnp_SecureHash"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);

  const secretKey = config.get("vnp_HashSecret") as string;
  const signData = qs.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  return secureHash === signed;
};

// Hàm sắp xếp object theo key (dùng để tạo chuỗi ký)
export const sortObject = (obj: VnpParams): { [key: string]: string } => {
  const global: { [key: string]: string } = {};
  const str: string[] = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (let key = 0; key < str.length; key++) {
    const strKey = decodeURIComponent(str[key]);
    const value = obj[strKey];
    if (value !== undefined && value !== null && value !== "") {
      global[strKey] = encodeURIComponent(String(value)).replace(/%20/g, "+");
    }
  }
  return global;
};
