import { Router } from "express"; 
import { createPaymentUrl, vnpayReturn, vnpayIpn } from "../controllers/payment.controller.js"; 
import { verifyToken } from "../middlewares/verifyToken.middleware.js";
const paymentRouter = Router(); 

paymentRouter.post("/create_payment_url", verifyToken, createPaymentUrl); 
paymentRouter.get("/vnpay_return", vnpayReturn); 
paymentRouter.get("/vnpay_ipn", vnpayIpn); 

export default paymentRouter;
