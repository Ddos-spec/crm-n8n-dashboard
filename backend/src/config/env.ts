import dotenv from 'dotenv';
dotenv.config();

if (!process.env.CORS_ORIGIN) {
  throw new Error('CORS_ORIGIN environment variable is required');
}
console.log('✅ CORS enabled for:', process.env.CORS_ORIGIN);

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export const env = {
  PORT: process.env.PORT || 1234,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  WHATSAPP_API_URL: process.env.WHATSAPP_API_URL,
  WHATSAPP_API_KEY: process.env.WHATSAPP_API_KEY,
  PUBLIC_URL: process.env.PUBLIC_URL,
  NODE_ENV: process.env.NODE_ENV || 'development',
};
