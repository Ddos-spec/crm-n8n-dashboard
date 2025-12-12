import cors from 'cors';
import { RequestHandler } from 'express';

export const corsMiddleware = (): RequestHandler => {
  const options = {
    origin: true, // Reflect request origin (allows credentials)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie'],
  };

  return cors(options);
};
