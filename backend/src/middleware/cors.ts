import cors from 'cors';
import { RequestHandler } from 'express';
import { env } from '../config/env';

export const corsMiddleware = (): RequestHandler => {
  // For same-VPS deployment, CORS can be more permissive
  // If CORS_ORIGIN is '*', allow all origins
  // Otherwise, use specified origins
  const origin = env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map(o => o.trim());

  const options = {
    origin, // Allow specified origins or all if wildcard
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400, // Cache preflight for 24 hours
  };

  return cors(options);
};
