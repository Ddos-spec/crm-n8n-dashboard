import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { checkDbConnection } from './lib/db';
import routes from './routes';

dotenv.config();

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED_REJECTION]', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT_EXCEPTION]', error);
});

const app = express();

// Trust proxy is required when running behind a reverse proxy (like Easypanel/Docker)
app.set('trust proxy', 1);

const allowedOrigins = config.corsOrigins;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'Origin'],
    maxAge: 86400,
  }),
);
app.options('*', cors());

// Enhanced Helmet configuration for security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
}));

app.use(compression()); // Enable Gzip compression

// Rate limiting to prevent brute force and DDoS attacks
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for sensitive endpoints
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    error: 'Too many requests to this endpoint',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all routes
app.use('/api/', generalLimiter);

// Apply strict rate limiting to message/AI endpoints
app.use('/api/send-message', strictLimiter);
app.use('/api/ai-chat', strictLimiter);

app.use(express.json({ limit: '1mb' })); // Limit request body size

app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  res.locals.requestId = requestId;
  next();
});

// Use the separated routes
app.use(routes);

app.use((_req, res) => {
  return res.status(404).json({
    error: 'Not Found',
    code: 'NOT_FOUND',
    meta: { requestId: res.locals.requestId, timestamp: new Date().toISOString() },
  });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[UNHANDLED_ERROR]', err);
  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    meta: { requestId: res.locals.requestId, timestamp: new Date().toISOString() },
  });
});

const port = config.port;

const start = async () => {
  try {
    console.log(`[BOOT] env=${config.nodeEnv} port=${port}`);
    console.log(`[BOOT] CORS origins: ${allowedOrigins.join(', ')}`);
    console.log('[BOOT] Checking database connectivity...');
    const dbOk = await checkDbConnection();
    if (!dbOk) {
      console.error('[BOOT] Database unreachable (check credentials/host)');
      process.exit(1);
    }
    console.log('[BOOT] Database reachable, starting HTTP server');

    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port} (${config.nodeEnv})`);
    });
  } catch (err) {
    console.error('[BOOT] Failed to start server', err);
    process.exit(1);
  }
};

void start();