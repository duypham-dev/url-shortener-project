import { Kafka } from 'kafkajs';
import { logger } from '../utils/logger';

const kafka = new Kafka({
  clientId: 'short-link-app',
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092']
});

export const producer = kafka.producer();
const admin = kafka.admin();

// Gọi hàm này lúc ứng dụng Node.js bắt đầu chạy (VD: trong index.ts)
export const initKafka = async () => {
  try {
    // 1. Kết nối Admin để kiểm tra và tạo Topic
    await admin.connect();
    const existingTopics = await admin.listTopics();
    
    if (!existingTopics.includes('click-events')) {
      logger.info('Topic "click-events" không tồn tại. Đang tạo mới...');
      await admin.createTopics({
        topics: [{
          topic: 'click-events',
          numPartitions: 1,     // Số partition (bạn có thể tăng lên nếu hệ thống lớn)
          replicationFactor: 1  // Vì bạn chạy 1 node kafka trên docker nên để là 1
        }]
      });
      logger.info('Đã tạo topic "click-events" thành công!');
    }
    await admin.disconnect();

    // 2. Kết nối Producer sẵn sàng chờ gửi tin nhắn
    await producer.connect();
    logger.info('Kafka Producer đã kết nối thành công!');

  } catch (error) {
    logger.error('Lỗi khởi tạo Kafka:', error);
  }
};