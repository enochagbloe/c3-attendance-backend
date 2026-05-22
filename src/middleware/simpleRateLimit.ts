import { NextFunction, Request, Response } from 'express';
import { sendError } from '../utils/apiResponse';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

type Entry = {
  count: number;
  resetAt: number;
};

export function createSimpleRateLimit(options: RateLimitOptions) {
  const store = new Map<string, Entry>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = options.keyGenerator?.(req) ?? req.ip ?? 'unknown';

    const existing = store.get(key);
    if (!existing || existing.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (existing.count >= options.maxRequests) {
      return sendError({
        res,
        message: 'Too many requests. Please wait a moment and try again.',
        statusCode: 429,
        code: 'RATE_LIMITED',
      });
    }

    existing.count += 1;
    store.set(key, existing);
    return next();
  };
}
