import { Router } from "express";
import moment from "moment";
import config from "config";
import qs from "qs";
import crypto from "crypto";

interface VnpParams {
    [key: string]: string | number;
}

const paymentRouter = Router();

paymentRouter.post("/create_payment_url", function (req, res, next) {
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    
    let date = new Date();
    let createDate = moment(date).format('YYYYMMDDHHmmss');
    
    let rawIpAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "127.0.0.1";
    let ipAddr = Array.isArray(rawIpAddr) ? rawIpAddr[0] : (typeof rawIpAddr === 'string' ? rawIpAddr.split(',')[0] : "127.0.0.1");
    if (ipAddr === '::1') ipAddr = '127.0.0.1';
    
    let tmnCode = config.get('vnp_TmnCode') as string;
    let secretKey = config.get('vnp_HashSecret') as string;
    let vnpUrl = config.get('vnp_Url') as string;
    let returnUrl = config.get('vnp_ReturnUrl') as string;
    let orderId = moment(date).format('DDHHmmss');
    let amount = req.body.amount;
    let bankCode = req.body.bankCode;
    
    let locale = req.body.language;
    console.log("Received payment request with language:", locale);
    if(locale === null || locale === '' || locale === undefined) {
        locale = 'vn';
    }
    let currCode = 'VND';
    let vnp_Params: VnpParams = {};
    
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = locale;
    vnp_Params['vnp_CurrCode'] = currCode;
    vnp_Params['vnp_TxnRef'] = orderId;
    vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang ' + orderId;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount * 100;
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    
    if(bankCode) { // Only set if truthy (not null, undefined, or empty string)
        vnp_Params['vnp_BankCode'] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);

    let signData = qs.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", secretKey);
    
    // Đã sửa 'new Buffer()' thành 'Buffer.from()' để tránh lỗi bảo mật/deprecated của Node.js bản mới
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex"); 
    
    vnp_Params['vnp_SecureHash'] = signed;
    vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false });

    // Thay vì redirect trực tiếp ở backend (gây lỗi CORS và không chuyển hướng trình duyệt của User),
    // trả về URL bằng JSON để frontend điều hướng.
    res.status(200).json({ paymentUrl: vnpUrl });
});

paymentRouter.get('/vnpay_return', function (req, res, next) {
    let vnp_Params = req.query as unknown as VnpParams;
    console.log("Received VNPay return with params: ", vnp_Params);
    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);

    let config = require('config');
    let tmnCode = config.get('vnp_TmnCode');
    let secretKey = config.get('vnp_HashSecret') as string;

    let signData = qs.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");     

    if(secureHash === signed){
        //Kiem tra xem du lieu trong db co hop le hay khong va thong bao ket qua

        const redirectUrl = `http://localhost:5173/payment-success?` + qs.stringify(vnp_Params, { encode: false });
        res.redirect(redirectUrl);
    } else {
        const redirectUrlUrlError = `http://localhost:5173/payment-success?vnp_ResponseCode=97&` + qs.stringify(vnp_Params, { encode: false });
        res.redirect(redirectUrlUrlError);
    }
});


paymentRouter.get('/vnpay_ipn', function (req, res, next) {
    let vnp_Params = req.query as unknown as VnpParams;
    var secureHash = vnp_Params['vnp_SecureHash'];
    console.log("Received IPN with params: ", vnp_Params);
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);

    var secretKey = config.get('vnp_HashSecret') as string;
    var signData = qs.stringify(vnp_Params, { encode: false });   
    var hmac = crypto.createHmac("sha512", secretKey);
    var signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");     
        

    if(secureHash === signed){
        var orderId = vnp_Params['vnp_TxnRef'];
        var rspCode = vnp_Params['vnp_ResponseCode'];
        console.log(`IPN for order ${orderId} with response code ${rspCode}`);
        //Kiem tra du lieu co hop le khong, cap nhat trang thai don hang va gui ket qua cho VNPAY theo dinh dang duoi
        res.status(200).json({RspCode: '00', Message: 'success'})
    }
    else {
        res.status(200).json({RspCode: '97', Message: 'Fail checksum'})
    }
});
    

function sortObject(obj: VnpParams): { [key: string]: string } {
    let global: { [key: string]: string } = {};
    let str: string[] = [];
    for (let key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (let key = 0; key < str.length; key++) {
        let strKey = decodeURIComponent(str[key]);
        global[strKey] = encodeURIComponent(String(obj[strKey])).replace(/%20/g, "+");
    }
    return global;
}




export default paymentRouter;