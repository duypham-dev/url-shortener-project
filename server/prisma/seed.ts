import 'dotenv/config'; // Bắt buộc: Tự động nạp biến môi trường từ file .env
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// 1. Lấy đường dẫn kết nối DB từ file .env
const connectionString = `${process.env.DATABASE_URL}`;

// 2. Khởi tạo kết nối Pool tới PostgreSQL
// const pool = new Pool({ connectionString });
const schema = new URL(connectionString).searchParams.get("schema") || "public";
console.log("Using database schema:", schema);
const adapter = new PrismaPg(
  {
    connectionString: process.env.DATABASE_URL,
  },
  {
    schema,
  },
);


// 4. Truyền adapter vào constructor của PrismaClient
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('⏳ Bắt đầu tạo dữ liệu gói dịch vụ (Seeding)...');

  // Kiểm tra xem database đã có gói nào chưa để tránh tạo trùng lặp
  const count = await prisma.subscription_plans.count();
  if (count > 0) {
    console.log('Hệ thống đã có sẵn các gói dịch vụ. Bỏ qua bước tạo mới.');
    return;
  }

  // Bắt đầu chèn các gói mặc định vào Database
  const plans = await prisma.subscription_plans.createMany({
    data: [
      {
        name: 'Gói Miễn Phí (Free)',
        tier: 'free',
        duration_days: 30,
        price: 0,
        currency: 'VND',
        max_links: 50,
        max_custom_links: 0,
        reset_period: 'monthly',
        allow_analytics: false,
        allow_custom_domain: false,
        sort_order: 1,
      },
      {
        name: 'Gói Cơ Bản (Basic)',
        tier: 'basic',
        duration_days: 30,
        price: 49000,
        currency: 'VND',
        max_links: 500,
        max_custom_links: 50,
        reset_period: 'monthly',
        allow_analytics: true,
        allow_custom_domain: false,
        sort_order: 2,
      },
      {
        name: 'Gói Cao Cấp (Premium)',
        tier: 'premium',
        duration_days: 30,
        price: 99000,
        currency: 'VND',
        max_links: 5000,
        max_custom_links: 500,
        reset_period: 'monthly',
        allow_analytics: true,
        allow_custom_domain: true,
        sort_order: 3,
      },
      {
        // GÓI TRẢ PHÍ THỨ 3 MỚI THÊM VÀO
        name: 'Gói Doanh Nghiệp (Enterprise)',
        tier: 'enterprise',
        duration_days: 30,
        price: 199000,
        currency: 'VND',
        max_links: 50000, // Số lượng link cực lớn
        max_custom_links: 5000,
        reset_period: 'monthly',
        allow_analytics: true,
        allow_custom_domain: true,
        sort_order: 4,
      }
    ],
  });

  console.log(`🎉 Đã tạo thành công ${plans.count} gói dịch vụ mặc định!`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });