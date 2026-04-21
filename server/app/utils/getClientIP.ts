import type { Request } from 'express';

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ipStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const forwardedIp = ipStr?.split(',')[0]?.trim();
  return forwardedIp || req.ip || req.socket.remoteAddress || 'unknown';
};

export default getClientIp;
