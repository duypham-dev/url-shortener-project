import Redis from 'ioredis';
import type { Response } from 'express';
import { logger } from '../utils/logger.js';

type Client = { res: Response; userId?: number | null };
const clients = new Map<string, Client>();
let redisSub: Redis | null = null;
let pingInterval: NodeJS.Timeout | null = null;

const startPing = () => {
  if (pingInterval) return;
  pingInterval = setInterval(() => {
    for (const client of clients.values()) {
      try { client.res.write(': ping\n\n'); } catch { /* ignore */ }
    }
  }, 25000);
};

export const initClickStreamConsumer = async (): Promise<void> => {
  if (redisSub) return;

  redisSub = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

  await redisSub.subscribe('click-stream');

  redisSub.on('message', (_channel: string, message: string) => {
    try {
      const payload = JSON.parse(message);
      broadcast(payload);
    } catch {
      logger.warn('ClickStream: invalid pub/sub message');
    }
  });

  startPing();
  logger.info('ClickStream: Redis Pub/Sub subscriber started.');
};

export const addSseClient = (res: Response, userId?: number | null): string => {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const client: Client = { res, userId: userId ?? null };
  clients.set(id, client);

  res.on('close', () => clients.delete(id));

  try {
    res.write(`event: connected\ndata: ${JSON.stringify({ id, message: 'connected' })}\n\n`);
  } catch { /* ignore */ }

  return id;
};

export const broadcast = (payload: unknown): void => {
  const data = JSON.stringify(payload);
  const targetUserId =
    typeof payload === 'object' && payload !== null &&
    typeof (payload as any).userId === 'number'
      ? (payload as any).userId : undefined;

  for (const [id, client] of clients.entries()) {
    try {
      if (typeof targetUserId !== 'undefined' && client.userId !== targetUserId) continue;
      client.res.write(`data: ${data}\n\n`);
    } catch {
      clients.delete(id);
    }
  }
};

export const activeClients = () => clients.size;
