import dotenv from 'dotenv';

dotenv.config();

/**
 * Browsers send Origin as scheme://host[:port] with no path or trailing slash.
 * Normalise CORS_ORIGIN entries to that shape so small typos don't block requests.
 */
function parseOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((o) => o.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, ''))
    .filter(Boolean)
    .map((o) => (/^https?:\/\//.test(o) ? o : `https://${o}`));
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4500),
  // MONGO_URL is what Railway's MongoDB service exposes
  mongoUri: required('MONGO_URI', process.env.MONGO_URL ?? 'mongodb://127.0.0.1:27017/restaurant_pos'),
  mongoDbName: process.env.MONGO_DB_NAME ?? 'restaurant_pos',
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN ?? 'http://localhost:8000'),
  superadmin: {
    name: process.env.SUPERADMIN_NAME ?? 'Super Admin',
    email: (process.env.SUPERADMIN_EMAIL ?? 'superadmin@pos.local').toLowerCase(),
    password: process.env.SUPERADMIN_PASSWORD ?? 'SuperAdmin@123',
  },
};
