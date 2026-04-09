/**
 * redis.ts
 * Khởi tạo Redis client singleton dùng ioredis.
 * Dùng để lưu/xoá refreshToken và blacklist accessToken.
 */
import Redis from "ioredis";

// Đọc URL từ biến môi trường, fallback localhost
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

// Tạo singleton instance
const redis = new Redis(redisUrl, {
  // Tự động reconnect khi mất kết nối
  retryStrategy: (times) => Math.min(times * 100, 3000),
  lazyConnect: true, // Chỉ connect khi có lệnh đầu tiên
});

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err.message));

export default redis;