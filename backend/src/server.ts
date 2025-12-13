import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { checkDbConnection } from './lib/db';
import { pool } from './lib/db';

dotenv.config();

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED_REJECTION]', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT_EXCEPTION]', error);
});

const app = express();

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

app.use(helmet());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  res.locals.requestId = requestId;
  next();
});

const buildMeta = (requestId: string) => ({
  timestamp: new Date().toISOString(),
  requestId,
});

app.get('/health', async (_req, res) => {
  try {
    const dbOk = await checkDbConnection();
    const status = dbOk ? 'ok' : 'db_unreachable';

    return res.status(dbOk ? 200 : 503).json({
      data: {
        status,
        uptime: process.uptime(),
      },
      meta: buildMeta(res.locals.requestId),
    });
  } catch (error) {
    console.error('[GET /health]', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'HEALTHCHECK_FAILED',
      message: config.nodeEnv === 'development' ? (error as Error)?.message : undefined,
      meta: buildMeta(res.locals.requestId),
    });
  }
});

app.get('/ping', (_req, res) => {
  return res.status(200).json({
    data: 'pong',
    meta: buildMeta(res.locals.requestId),
  });
});

app.get('/api/customers', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, phone, status, last_message_at
       FROM customers
       ORDER BY last_message_at DESC NULLS LAST
       LIMIT 100`,
    );
    return res.json({ data: result.rows, meta: buildMeta(res.locals.requestId) });
  } catch (error) {
    console.error('[GET /api/customers]', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'CUSTOMERS_FETCH_FAILED',
      meta: buildMeta(res.locals.requestId),
    });
  }
});

app.get('/api/escalations', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.id,
              c.name,
              c.phone,
              COALESCE(e.escalation_reason, e.chat_summary, '') AS issue,
              COALESCE(e.priority_level, 'normal') AS priority,
              e.status
       FROM escalations e
       JOIN customers c ON c.id = e.customer_id
       WHERE e.status = 'open'
       ORDER BY e.priority_level DESC, e.created_at DESC
       LIMIT 100`,
    );
    return res.json({ data: result.rows, meta: buildMeta(res.locals.requestId) });
  } catch (error) {
    console.error('[GET /api/escalations]', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'ESCALATIONS_FETCH_FAILED',
      meta: buildMeta(res.locals.requestId),
    });
  }
});

app.get('/api/chat-history', async (req, res) => {
  try {
    const customerId = Number(req.query.customerId);
    if (!customerId) {
      return res.status(400).json({
        error: 'customerId is required',
        code: 'INVALID_CUSTOMER_ID',
        meta: buildMeta(res.locals.requestId),
      });
    }
    const result = await pool.query(
      `SELECT id, customer_id, message_type, content, created_at, escalated
       FROM chat_history
       WHERE customer_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [customerId],
    );
    return res.json({ data: result.rows, meta: buildMeta(res.locals.requestId) });
  } catch (error) {
    console.error('[GET /api/chat-history]', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'CHAT_HISTORY_FETCH_FAILED',
      meta: buildMeta(res.locals.requestId),
    });
  }
});

app.get('/api/campaigns', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT campaign_batch AS name,
              total_leads,
              contacted,
              invalid,
              avg_lead_score,
              batch_date
       FROM campaign_performance
       ORDER BY batch_date DESC NULLS LAST
       LIMIT 50`,
    );
    return res.json({ data: result.rows, meta: buildMeta(res.locals.requestId) });
  } catch (error) {
    console.error('[GET /api/campaigns]', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'CAMPAIGNS_FETCH_FAILED',
      meta: buildMeta(res.locals.requestId),
    });
  }
});

app.get('/api/marketing', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT campaign_batch AS name,
              COUNT(*) AS total_leads,
              COUNT(CASE WHEN message_sent = true THEN 1 END) AS contacted,
              COUNT(CASE WHEN status = 'invalid_whatsapp' THEN 1 END) AS invalid,
              AVG(lead_score) AS avg_lead_score,
              MAX(created_at) AS batch_date
       FROM businesses
       GROUP BY campaign_batch
       ORDER BY batch_date DESC NULLS LAST
       LIMIT 50`,
    );
    return res.json({ data: result.rows, meta: buildMeta(res.locals.requestId) });
  } catch (error) {
    console.error('[GET /api/marketing]', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'MARKETING_FETCH_FAILED',
      meta: buildMeta(res.locals.requestId),
    });
  }
});

app.post('/api/send-message', async (req, res) => {
  try {
    if (!config.whatsappUrl || !config.whatsappApiKey) {
      return res.status(500).json({
        error: 'WhatsApp gateway not configured',
        code: 'WHATSAPP_CONFIG_MISSING',
        meta: buildMeta(res.locals.requestId),
      });
    }

    const { mtype, receiver, text, url, filename } = req.body as {
      mtype?: string;
      receiver?: string;
      text?: string;
      url?: string;
      filename?: string;
    };

    const allowedTypes = ['text', 'image', 'video', 'audio', 'audioconvert', 'document', 'sticker', 'stickerconvert'];

    if (!mtype || !allowedTypes.includes(mtype)) {
      return res.status(400).json({
        error: 'Invalid mtype',
        code: 'INVALID_MTYPE',
        meta: buildMeta(res.locals.requestId),
      });
    }

    if (!receiver) {
      return res.status(400).json({
        error: 'receiver is required',
        code: 'INVALID_RECEIVER',
        meta: buildMeta(res.locals.requestId),
      });
    }

    if (mtype === 'text' && !text) {
      return res.status(400).json({
        error: 'text is required for mtype=text',
        code: 'INVALID_TEXT',
        meta: buildMeta(res.locals.requestId),
      });
    }

    if (mtype !== 'text' && !url) {
      return res.status(400).json({
        error: 'url is required for media message',
        code: 'INVALID_URL',
        meta: buildMeta(res.locals.requestId),
      });
    }

    const payload = {
      apikey: config.whatsappApiKey,
      mtype,
      receiver,
      text,
      url,
      filename,
    };

    const gwRes = await fetch(config.whatsappUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const gwJson = await gwRes.json().catch(() => ({}));

    if (!gwRes.ok) {
      return res.status(502).json({
        error: 'Gateway error',
        code: 'WHATSAPP_GATEWAY_FAILED',
        details: gwJson,
        meta: buildMeta(res.locals.requestId),
      });
    }

    return res.status(200).json({
      data: gwJson,
      meta: buildMeta(res.locals.requestId),
    });
  } catch (error) {
    console.error('[POST /api/send-message]', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SEND_MESSAGE_FAILED',
      meta: buildMeta(res.locals.requestId),
    });
  }
});
app.use((_req, res) => {
  return res.status(404).json({
    error: 'Not Found',
    code: 'NOT_FOUND',
    meta: buildMeta(res.locals.requestId),
  });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[UNHANDLED_ERROR]', err);
  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    meta: buildMeta(res.locals.requestId),
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
