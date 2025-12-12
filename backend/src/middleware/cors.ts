import cors from 'cors';
import { RequestHandler } from 'express';

export const corsMiddleware = (): RequestHandler => {
  if (!process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN environment variable is required');
  }

  const origins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());

  const options = {
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  };

  return cors(options);
};
