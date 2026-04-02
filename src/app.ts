import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import memberRoutes from './modules/members/members.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import servicesRoutes from './modules/services/services.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import usersRoutes from './modules/users/users.routes';
import lookupsRoutes from './modules/lookups/lookups.routes';
import settingsRoleRoutes from './modules/settings/roles.routes';
import { sendError } from './utils/apiResponse';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

  // Simple root + health checks
  app.get('/', (_req, res) => res.json({ success: true, message: 'Church Management API', version: 'v1' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/members', memberRoutes);
  app.use('/api/v1/attendance', attendanceRoutes);
  app.use('/api/v1/services', servicesRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/lookups', lookupsRoutes);
  app.use('/api/v1/settings', settingsRoleRoutes);

  app.use((_req, res) => sendError({ res, message: 'Route not found', statusCode: 404, code: 'NOT_FOUND' }));

  app.use(errorHandler);

  return app;
}
