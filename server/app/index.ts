/**
 * index.ts - Express App setup
 * Thứ tự middleware quan trọng:
 * 1. Security middleware (helmet, cors)
 * 2. Logging (morgan)
 * 3. Body parsing, cookies
 * 4. Routes
 * 5. 404 handler
 * 6. Global error handler (CUỐI CÙNG)
 */
import express from "express";
import "dotenv/config";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import shortenRouter from "./routes/shortlink.route.js";
import authRouter from "./routes/auth.route.js";
import paymentRouter  from "./routes/payment.route.js";
import subscriptionRouter from "./routes/subscription.route.js";
import qrRouter from "./routes/qrCode.route.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/errorHandler.middleware.js";

const app = express();

// Disable ETag generation to avoid conditional GETs being served from disk cache
app.set('etag', false);

const baseUrl = process.env.BASE_URL ?? "/api/v1";
const corsOptions = {
  origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
  credentials: true, // Required to send/receive httpOnly refreshToken cookie
};

// ---- Security ----
app.use(
  helmet({
    referrerPolicy: { policy: "no-referrer" },
    // Allow cross-origin resource loads after redirect (needed for short-link redirects)
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  })
);
app.use(cors(corsOptions));

// ---- Logging ----
app.use(morgan("common"));

// ---- Body & Cookie parsing ----
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Ensure responses are not cached by browsers or intermediate proxies
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ---- Routes ----
app.use(`${baseUrl}/auth`, authRouter);     // /api/v1/auth/*
app.use(`${baseUrl}/subscriptions`, subscriptionRouter);  // /api/v1/subscriptions/*
app.use(baseUrl, paymentRouter);
app.use(baseUrl, qrRouter);                // /api/v1/qr-codes/* and /api/v1/links/:shortCode/qr
app.use(baseUrl, shortenRouter);            // /api/v1/*


// ---- 404 handler ----
app.use(notFoundHandler);

// ---- Global error handler ----
app.use(errorHandler);

export default app;