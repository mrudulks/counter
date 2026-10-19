import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4500),
  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/restaurant_pos'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:8000',
  superadmin: {
    name: process.env.SUPERADMIN_NAME ?? 'Super Admin',
    email: (process.env.SUPERADMIN_EMAIL ?? 'superadmin@pos.local').toLowerCase(),
    password: process.env.SUPERADMIN_PASSWORD ?? 'SuperAdmin@123',
  },
};
