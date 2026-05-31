import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const required = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_BASE_URL'];
const missingRequired = required.filter((key) => !process.env[key]);

if (missingRequired.length > 0) {
  throw new Error(`[env] Missing required env var(s): ${missingRequired.join(', ')}`);
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'changeme',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  logLevel: process.env.LOG_LEVEL || 'info',
  signupKey: process.env.SIGNUP_KEY || '',
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || '',
};
