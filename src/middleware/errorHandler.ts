import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/appError';
import { env } from '../config/env';
import { logger } from '../lib/logger';

type MaybeAppError = { statusCode?: number; code?: string; message?: string };

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const appErr = err as MaybeAppError;
  if (err instanceof AppError || (appErr?.statusCode && appErr?.message)) {
    const status = appErr.statusCode ?? 400;
    const code = appErr.code;
    logger.warn('Handled AppError', { message: appErr.message, code, status });
    return res.status(status).json({ success: false, error: { message: appErr.message || 'Error', code } });
  }

  // Log full error for visibility in dev
  // eslint-disable-next-line no-console
  console.error(err);
  logger.error('Unhandled error', { err });
  const detail = env.nodeEnv !== 'production' ? { detail: (err as Error)?.message } : {};
  return res.status(500).json({ success: false, error: { message: 'Internal server error', ...detail } });
}
