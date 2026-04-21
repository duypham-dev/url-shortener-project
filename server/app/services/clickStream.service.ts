import type { Response } from 'express';
import { kafka, CLICK_EVENTS_TOPIC } from './kafka.service.js';
import { logger } from '../utils/logger.js';
import type { ClickEventMessage } from './link.service.js';

type Client = {
  res: Response;
  userId?: number | null;
};

type StreamPayload = Partial<ClickEventMessage> & Record<string, unknown>;

const clients = new Map<string, Client>();
let consumer: ReturnType<typeof kafka.consumer> | null = null;
let started = false;
let pingInterval: NodeJS.Timeout | null = null;

const startPing = () => {
  if (pingInterval) return;
  pingInterval = setInterval(() => {
    for (const client of clients.values()) {
      try {
        // SSE comment keeps connection alive
        client.res.write(': ping\n\n');
      } catch {
        // ignore individual client errors; they'll be cleaned up on close
      }
    }
  }, 25000);
};

export const initClickStreamConsumer = async (): Promise<void> => {
  if (started) return;

  try {
    consumer = kafka.consumer({ groupId: process.env.KAFKA_STREAM_GROUP_ID ?? 'click-stream-broadcaster' });
    await consumer.connect();
    await consumer.subscribe({ topic: CLICK_EVENTS_TOPIC, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const payload = JSON.parse(message.value.toString());
          broadcast(payload);
        } catch (err) {
          logger.warn('ClickStream: invalid Kafka message, skipping', { err });
        }
      },
    });

    started = true;
    logger.info('ClickStream: consumer running and broadcasting to SSE clients');
    startPing();
  } catch (err) {
    logger.error('ClickStream: failed to start consumer', { err });
  }
};

export const addSseClient = (res: Response, userId?: number | null): string => {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const client: Client = { res };
  if (typeof userId === 'number' || userId === null) {
    client.userId = userId;
  }
  clients.set(id, client);

  // Remove client on close
  res.on('close', () => {
    clients.delete(id);
  });

  // Send initial connected event
  try {
    res.write(`event: connected\ndata: ${JSON.stringify({ id, message: 'connected' })}\n\n`);
  } catch (err) {
    // ignore write errors for initial event
  }

  return id;
};

export const broadcast = (payload: unknown): void => {
  const data = JSON.stringify(payload);

  // If the payload contains userId, only send to clients that belong to that user.
  const targetUserId =
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as StreamPayload).userId === 'number'
      ? (payload as StreamPayload).userId
      : undefined;

  for (const [id, client] of clients.entries()) {
    try {
      if (typeof targetUserId !== 'undefined' && client.userId !== targetUserId) {
        continue; // skip clients that don't belong to the owner
      }
      client.res.write(`data: ${data}\n\n`);
    } catch (err) {
      logger.warn('ClickStream: failed to write to client, removing', { id, err });
      clients.delete(id);
    }
  }
};

export const activeClients = () => clients.size;
