import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const required = ['DATABASE_URL', 'JWT_SECRET'];
required.forEach((key) => {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.warn(`[env] Missing required env var ${key}.`);
  }
});

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'changeme',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  logLevel: process.env.LOG_LEVEL || 'info',
  signupKey: process.env.SIGNUP_KEY || '',
  selfUpdateBaseUrl: process.env.SELF_UPDATE_BASE_URL || 'http://localhost:3000/member-self-update',
  selfRegisterBaseUrl: process.env.SELF_REGISTER_BASE_URL || 'http://localhost:3000/member-register',
};
