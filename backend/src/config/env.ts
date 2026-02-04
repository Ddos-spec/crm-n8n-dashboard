import dotenv from 'dotenv';

dotenv.config();

const getEnv = (key: string) => process.env[key] ?? process.env[key.toLowerCase()];

const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'] as const;
const missing = requiredEnv.filter((key) => !getEnv(key));

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const corsOrigin = getEnv('CORS_ORIGIN');

export const config = {
  nodeEnv: getEnv('NODE_ENV') || 'development',
  port: Number(getEnv('PORT')) || 3000,
  databaseUrl: getEnv('DATABASE_URL') as string,
  jwtSecret: getEnv('JWT_SECRET') as string,
  corsOrigins: corsOrigin
    ? corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)
    : ['http://localhost:5173', 'https://crm-n8n-dashboard.vercel.app'],
  whatsappUrl: getEnv('WHATSAPP_URL') || '',
  whatsappApiKey: getEnv('API_WHATSAPP') || '',
};
