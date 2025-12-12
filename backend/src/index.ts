import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { corsMiddleware } from './middleware/cors';
import { env } from './config/env';

// Initialize Prisma
export const prisma = new PrismaClient();

const app = express();

// Middleware
app.use(express.json());
app.use(corsMiddleware());
// Preflight handled by corsMiddleware above automatically

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      db: 'connected',
      uptime: process.uptime(),
      version: '1.0.0'
    });
  } catch (error: any) {
    console.error('DB Connection Failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Routes (Placeholders for now)
app.get('/', (req, res) => {
  res.send('CRM Backend API Running');
});

// Import Routes
import businessRoutes from './routes/businesses';
import customerRoutes from './routes/customers';
import chatRoutes from './routes/chat';
import escalationRoutes from './routes/escalations';
import knowledgeRoutes from './routes/knowledge';
import whatsappRoutes from './routes/whatsapp';
import analyticsRoutes from './routes/analytics';

app.use('/api/businesses', businessRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/escalations', escalationRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/analytics', analyticsRoutes);

import path from 'path';

// ... (imports remain)

// Error Handling
import { errorHandler } from './middleware/errorHandler';
// app.use(errorHandler); // Move this to bottom

const PORT = env.PORT;

// --- SERVE FRONTEND STATIC FILES ---
// Pastikan folder 'public' ada di root backend (sejajar dengan package.json)
// atau sesuaikan path-nya.
app.use(express.static(path.join(__dirname, '../public')));

// Handle React Routing (SPA) - Send index.html for any unknown route
// KECUALI route yang diawali /api (biar error API tetap return JSON, bukan HTML)
app.use((req, res, next) => {
  // Skip if it's an API route
  if (req.path.startsWith('/api')) {
    return next();
  }
  // Serve index.html for all other routes (SPA routing)
  res.sendFile(path.join(__dirname, '../public/index.html'), (err) => {
    if (err) {
      next(err);
    }
  });
});

app.use(errorHandler); // Error handler ditaruh paling bawah

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});
