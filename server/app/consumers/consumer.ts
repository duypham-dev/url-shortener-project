import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

type PrismaInstance = (typeof import('../libs/prisma.js'))['prisma'];

interface ClickEventMessage {
  shortCode?: string;
  ip?: string;
  userAgent?: string;
  timestamp?: string;
}

// npx tsx watch app/consumers/consumer.ts để chạy consumer và tự động reload khi có thay đổi

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const kafka = new Kafka({
  clientId: 'short-link-app',
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092']
});

// Khởi tạo consumer thuộc một consumer group
const consumer = kafka.consumer({ groupId: 'click-tracking-group' });

let prisma: PrismaInstance;

const startConsumer = async () => {
  // Load prisma after env is available
  const prismaModule = await import('../libs/prisma');
  prisma = prismaModule.prisma;

  await consumer.connect();
  console.log('Kafka Consumer đã kết nối thành công.');

  // Đăng ký nghe từ topic 'click-events', từ lúc bắt đầu nếu chưa có offset
  await consumer.subscribe({ topic: 'click-events', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        if (!message.value) {
          return;
        }

        const clickData = JSON.parse(message.value.toString()) as ClickEventMessage;
        if (!clickData.shortCode) {
          return;
        }

        const clickedAt = clickData.timestamp ? new Date(clickData.timestamp) : new Date();
        
        console.log(` Đã nhận sự kiện từ partition ${partition}:`);
        console.log(clickData);
        await prisma.click_logs.create({
          data: {
            short_code: clickData.shortCode,
            ip_address: clickData.ip ?? null,
            user_agent: clickData.userAgent ?? null,
            clicked_at: clickedAt,
          }
        });

      } catch (error) {
        console.error('Lỗi khi xử lý message:', error);
      }
    },
  });
};

startConsumer().catch(console.error);

// Xử lý ngắt kết nối an toàn
process.on('SIGINT', async () => {
  await consumer.disconnect();
  process.exit(0);
});