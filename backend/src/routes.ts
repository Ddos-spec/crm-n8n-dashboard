import { Router } from 'express';
import multer from 'multer';
import DxfParser from 'dxf-parser';
import potrace from 'potrace';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
import { createCanvas } from 'canvas';
import { pool } from './lib/db';
import { config } from './config/env';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/svg+xml', 'application/dxf', 'image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
    const allowedExts = ['.svg', '.dxf', '.png', '.jpg', '.jpeg', '.webp', '.pdf'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedExts.includes(ext) || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: SVG, DXF, PNG, JPG, WEBP, PDF'));
    }
  },
});

// Canvas Factory for PDF.js in Node environment
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return {
      canvas,
      context,
    };
  }

  reset(canvasAndContext: any, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: any) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

const router = Router();

// Input validation helpers
const sanitizeString = (input: unknown): string | null => {
  if (input === null || input === undefined) return null;
  const str = String(input).trim();
  // Remove potentially dangerous characters for SQL/XSS
  return str.replace(/[<>'"`;\\]/g, '').slice(0, 500); // Limit length
};

const validatePositiveInt = (input: unknown, defaultValue: number, max: number): number => {
  const num = parseInt(String(input), 10);
  if (isNaN(num) || num < 0) return defaultValue;
  return Math.min(num, max);
};

const validateId = (input: unknown): number | null => {
  const num = parseInt(String(input), 10);
  if (isNaN(num) || num <= 0) return null;
  return num;
};

const buildMeta = (requestId: string) => ({
  timestamp: new Date().toISOString(),
  requestId,
});

// Health check
router.get('/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT 1 as ok');
    const dbOk = result.rows[0]?.ok === 1;
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

router.get('/ping', (_req, res) => {
  return res.status(200).json({
    data: 'pong',
    meta: buildMeta(res.locals.requestId),
  });
});

// Dashboard Stats
router.get('/api/stats', async (_req, res) => {
  try {
    const calcTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Whitelist of allowed tables and columns to prevent SQL injection
    const allowedTables = ['customers', 'chat_history', 'escalations', 'businesses'] as const;
    const allowedDateColumns: Record<typeof allowedTables[number], string> = {
      customers: 'last_message_at',
      chat_history: 'created_at',
      escalations: 'created_at',
      businesses: 'created_at',
    };

    const getMonthCount = async (table: typeof allowedTables[number], where = '') => {
      // Validate table name against whitelist
      if (!allowedTables.includes(table)) {
        throw new Error(`Invalid table name: ${table}`);
      }
      const dateCol = allowedDateColumns[table];

      const q = `
        SELECT
          COUNT(*) FILTER (WHERE date_trunc('month', ${dateCol}) = date_trunc('month', CURRENT_DATE))::int as curr,
          COUNT(*) FILTER (WHERE date_trunc('month', ${dateCol}) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month'))::int as prev
        FROM ${table}
        ${where ? 'WHERE ' + where : ''}
      `;
      const result = await pool.query(q);
      return { curr: result.rows[0].curr, prev: result.rows[0].prev };
    };

    // 1. Total Customers (All Time) + Trend (Active Monthly)
    const totalCustRes = await pool.query('SELECT COUNT(*)::int as count FROM customers');
    const custTrendStats = await getMonthCount('customers');
    const custTrend = calcTrend(custTrendStats.curr, custTrendStats.prev);

    // 2. Total Chats (All Time) + Trend (Monthly Volume)
    const totalChatRes = await pool.query('SELECT COUNT(*)::int as count FROM chat_history');
    const chatTrendStats = await getMonthCount('chat_history');
    const chatTrend = calcTrend(chatTrendStats.curr, chatTrendStats.prev);

    // 3. Open Escalations (Current Snapshot) + Trend (New Escalations Month vs Month)
    const openEscRes = await pool.query("SELECT COUNT(*)::int as count FROM escalations WHERE status = 'open'");
    const escTrendStats = await getMonthCount('escalations'); // Trend of NEW escalations
    const escTrend = calcTrend(escTrendStats.curr, escTrendStats.prev);

    // 4. Leads (This Month) + Trend (vs Last Month)
    const leadsTrendStats = await getMonthCount('businesses');
    const leadsTrend = calcTrend(leadsTrendStats.curr, leadsTrendStats.prev);

    return res.json({
      data: {
        // Values
        totalCustomers: totalCustRes.rows[0]?.count || 0,
        totalChats: totalChatRes.rows[0]?.count || 0,
        openEscalations: openEscRes.rows[0]?.count || 0,
        leadsThisMonth: leadsTrendStats.curr || 0, // Specifically "This Month"

        // Trends
        customerTrend: `${custTrend > 0 ? '+' : ''}${custTrend}%`,
        customerTrendStatus: custTrend >= 0 ? 'up' : 'down',

        chatTrend: `${chatTrend > 0 ? '+' : ''}${chatTrend}%`,
        chatTrendStatus: chatTrend >= 0 ? 'up' : 'down',

        escTrend: `${escTrend > 0 ? '+' : ''}${escTrend}%`,
        escTrendStatus: escTrend <= 0 ? 'up' : 'down', // For escalations, down is usually "good" (green), but UI expects 'up'='green'. Let's stick to trend direction.
        // Wait, UI uses 'up' -> Green, 'down' -> Red. 
        // For escalations, Increase -> Red (Bad), Decrease -> Green (Good).
        // Let's invert the status for logic: if trend > 0 (Increase), status = 'down' (Red).
        escTrendInverted: true, 

        leadsTrend: `${leadsTrend > 0 ? '+' : ''}${leadsTrend}%`,
        leadsTrendStatus: leadsTrend >= 0 ? 'up' : 'down',
      },
      meta: buildMeta(res.locals.requestId),
    });
  } catch (error) {
    console.error('[GET /api/stats]', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'STATS_FETCH_FAILED',
      meta: buildMeta(res.locals.requestId),
    });
  }
});

// Customers
router.get('/api/customers', async (req, res) => {
  try {
    const limit = validatePositiveInt(req.query.limit, 20, 1000);
    const offset = validatePositiveInt(req.query.offset, 0, 100000);
    const search = sanitizeString(req.query.search);

    const params: (string | number)[] = [limit, offset];
    let whereClause = '';

    if (search) {
      params.push(`%${search}%`);
      whereClause = `WHERE name ILIKE $3 OR phone ILIKE $3`;
    }

    // Optimized: Select specific columns with pagination
    const result = await pool.query(
      `SELECT id, name, phone, status, last_message_at
       FROM customers
       ${whereClause}
       ORDER BY last_message_at DESC NULLS LAST
       LIMIT $1 OFFSET $2`,
      params
    );

    return res.json({
      data: result.rows,
      meta: { ...buildMeta(res.locals.requestId), limit, offset }
    });
  } catch (error) {
    console.error('[GET /api/customers]', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'CUSTOMERS_FETCH_FAILED',
      meta: buildMeta(res.locals.requestId),
    });
  }
});

// Escalations
router.get('/api/escalations', async (_req, res) => {
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

// Chat History
router.get('/api/chat-history', async (req, res) => {
  try {
    const customerId = validateId(req.query.customerId);
    if (!customerId) {
      return res.status(400).json({
        error: 'customerId is required and must be a positive integer',
        code: 'INVALID_CUSTOMER_ID',
        meta: buildMeta(res.locals.requestId),
      });
    }

    // Support pagination for better performance
    const limit = validatePositiveInt(req.query.limit, 50, 200);
    const offset = validatePositiveInt(req.query.offset, 0, 100000);

    const result = await pool.query(
      `SELECT id, customer_id, message_type, content, created_at, escalated
       FROM chat_history
       WHERE customer_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [customerId, limit, offset],
    );

    return res.json({
      data: result.rows,
      meta: { ...buildMeta(res.locals.requestId), limit, offset }
    });
  } catch (error) {
    console.error('[GET /api/chat-history]', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'CHAT_HISTORY_FETCH_FAILED',
      meta: buildMeta(res.locals.requestId),
    });
  }
});

// Campaigns
router.get('/api/campaigns', async (_req, res) => {
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

// Businesses (Leads)
router.get('/api/businesses', async (req, res) => {
  try {
    const limit = validatePositiveInt(req.query.limit, 50, 200);
    const offset = validatePositiveInt(req.query.offset, 0, 100000);
    const status = sanitizeString(req.query.status);
    const search = sanitizeString(req.query.search);

    const where: string[] = [];
    const params: Array<string | number> = [];
    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      where.push(`(name ILIKE $${params.length} OR phone ILIKE $${params.length})`);
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM businesses ${whereClause}`, params);
    const total = countRes.rows[0]?.total ?? 0;

    params.push(limit);
    params.push(offset);
    const rowsRes = await pool.query(
      `SELECT id, name, phone, status, campaign_batch, lead_score, location, market_segment, has_phone, message_sent, created_at
       FROM businesses
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return res.json({
      data: rowsRes.rows,
      meta: { total, limit, offset, requestId: buildMeta(res.locals.requestId).requestId },
    });
  } catch (error) {
    console.error('[GET /api/businesses]', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'BUSINESSES_FETCH_FAILED',
      meta: buildMeta(res.locals.requestId),
    });
  }
});

// Marketing Aggregation
router.get('/api/marketing', async (_req, res) => {
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

// Notifications (aggregated from escalations, recent chats, and new leads)
router.get('/api/notifications', async (_req, res) => {
  try {
    const notifications: Array<{
      id: string;
      type: 'escalation' | 'chat' | 'lead';
      title: string;
      message: string;
      time: string;
      read: boolean;
      link: string;
      customerId?: number;
      businessId?: number;
    }> = [];

    // 1. Get recent escalations (last 24 hours)
    const escalations = await pool.query(
      `SELECT e.id, c.name, c.id as customer_id, e.escalation_reason, e.chat_summary, e.created_at
       FROM escalations e
       JOIN customers c ON c.id = e.customer_id
       WHERE e.status = 'open' AND e.created_at > NOW() - INTERVAL '24 hours'
       ORDER BY e.created_at DESC
       LIMIT 5`
    );

    for (const esc of escalations.rows) {
      notifications.push({
        id: `esc-${esc.id}`,
        type: 'escalation',
        title: 'Escalation baru',
        message: `dari ${esc.name || 'Customer'} ${esc.escalation_reason ? `mengenai ${esc.escalation_reason}` : 'membutuhkan perhatian segera'}`,
        time: esc.created_at,
        read: false,
        link: '/customer-service',
        customerId: esc.customer_id,
      });
    }

    // 2. Get recent incoming messages (last 2 hours)
    const recentChats = await pool.query(
      `SELECT ch.id, c.name, c.id as customer_id, ch.content, ch.created_at
       FROM chat_history ch
       JOIN customers c ON c.id = ch.customer_id
       WHERE ch.message_type IN ('in', 'inbound', 'customer')
         AND ch.created_at > NOW() - INTERVAL '2 hours'
       ORDER BY ch.created_at DESC
       LIMIT 5`
    );

    for (const chat of recentChats.rows) {
      const preview = chat.content?.length > 50 ? chat.content.substring(0, 50) + '...' : chat.content;
      notifications.push({
        id: `chat-${chat.id}`,
        type: 'chat',
        title: 'Pesan baru',
        message: `dari ${chat.name || 'Customer'}: "${preview}"`,
        time: chat.created_at,
        read: false,
        link: '/customer-service',
        customerId: chat.customer_id,
      });
    }

    // 3. Get new high-score leads (last 24 hours, score > 80)
    const newLeads = await pool.query(
      `SELECT id, name, lead_score, created_at
       FROM businesses
       WHERE created_at > NOW() - INTERVAL '24 hours' AND lead_score > 80
       ORDER BY created_at DESC
       LIMIT 5`
    );

    for (const lead of newLeads.rows) {
      notifications.push({
        id: `lead-${lead.id}`,
        type: 'lead',
        title: 'Lead baru',
        message: `${lead.name || 'Business'} dengan score ${lead.lead_score} ditambahkan`,
        time: lead.created_at,
        read: false,
        link: '/marketing',
        businessId: lead.id,
      });
    }

    // Sort by time (most recent first)
    notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return res.json({
      data: notifications.slice(0, 10), // Max 10 notifications
      meta: buildMeta(res.locals.requestId),
    });
  } catch (error) {
    console.error('[GET /api/notifications]', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'NOTIFICATIONS_FETCH_FAILED',
      meta: buildMeta(res.locals.requestId),
    });
  }
});

// Update business status
router.patch('/api/businesses/:id', async (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({
        error: 'Invalid business ID',
        code: 'INVALID_ID',
        meta: buildMeta(res.locals.requestId),
      });
    }

    const { status, message_sent } = req.body as { status?: string; message_sent?: boolean };

    // Validate status against allowed values
    const allowedStatuses = ['new', 'contacted', 'qualified', 'invalid_whatsapp', 'not_interested', 'converted'];
    const sanitizedStatus = status ? sanitizeString(status) : undefined;

    if (sanitizedStatus && !allowedStatuses.includes(sanitizedStatus)) {
      return res.status(400).json({
        error: 'Invalid status value',
        code: 'INVALID_STATUS',
        meta: buildMeta(res.locals.requestId),
      });
    }

    const updates: string[] = [];
    const params: (string | number | boolean)[] = [];

    if (sanitizedStatus) {
      params.push(sanitizedStatus);
      updates.push(`status = $${params.length}`);
    }
    if (typeof message_sent === 'boolean') {
      params.push(message_sent);
      updates.push(`message_sent = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        code: 'NO_UPDATE_FIELDS',
        meta: buildMeta(res.locals.requestId),
      });
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE businesses SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Business not found',
        code: 'BUSINESS_NOT_FOUND',
        meta: buildMeta(res.locals.requestId),
      });
    }

    return res.json({
      data: result.rows[0],
      meta: buildMeta(res.locals.requestId),
    });
  } catch (error) {
    console.error('[PATCH /api/businesses/:id]', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'BUSINESS_UPDATE_FAILED',
      meta: buildMeta(res.locals.requestId),
    });
  }
});

// Send Message Gateway
router.post('/api/send-message', async (req, res) => {
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
        error: 'Invalid mtype. Allowed: ' + allowedTypes.join(', '),
        code: 'INVALID_MTYPE',
        meta: buildMeta(res.locals.requestId),
      });
    }

    // Validate receiver - must be a valid phone number format (digits, +, -)
    if (!receiver || !/^[+\d][\d\s-]{8,20}$/.test(receiver.replace(/\s/g, ''))) {
      return res.status(400).json({
        error: 'receiver must be a valid phone number',
        code: 'INVALID_RECEIVER',
        meta: buildMeta(res.locals.requestId),
      });
    }

    // Sanitize text content
    const sanitizedText = text ? text.slice(0, 4096) : undefined; // Limit message length

    if (mtype === 'text' && !sanitizedText) {
      return res.status(400).json({
        error: 'text is required for mtype=text',
        code: 'INVALID_TEXT',
        meta: buildMeta(res.locals.requestId),
      });
    }

    // Validate URL format for media messages
    if (mtype !== 'text') {
      if (!url) {
        return res.status(400).json({
          error: 'url is required for media message',
          code: 'INVALID_URL',
          meta: buildMeta(res.locals.requestId),
        });
      }
      // Basic URL validation
      try {
        new URL(url);
      } catch {
        return res.status(400).json({
          error: 'url must be a valid URL',
          code: 'INVALID_URL_FORMAT',
          meta: buildMeta(res.locals.requestId),
        });
      }
    }

    // Sanitize filename
    const sanitizedFilename = filename ? filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255) : undefined;

    const payload = {
      apikey: config.whatsappApiKey,
      mtype,
      receiver: receiver.replace(/\s/g, ''), // Remove spaces from phone number
      text: sanitizedText,
      url,
      filename: sanitizedFilename,
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

// AI Chat Proxy (legacy - kept for backward compatibility)
router.post('/api/ai-chat', async (req, res) => {
  try {
    const { message } = req.body as { message?: string };

    // Validate message input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'message is required and must be a string',
        code: 'INVALID_MESSAGE',
        meta: buildMeta(res.locals.requestId),
      });
    }

    // Limit message length to prevent abuse
    const sanitizedMessage = message.trim().slice(0, 2000);
    if (sanitizedMessage.length === 0) {
      return res.status(400).json({
        error: 'message cannot be empty',
        code: 'EMPTY_MESSAGE',
        meta: buildMeta(res.locals.requestId),
      });
    }

    const webhookUrl = process.env.N8N_CHAT_WEBHOOK;

    if (!webhookUrl) {
      // Mock response if webhook not configured
      await new Promise(resolve => setTimeout(resolve, 500));
      return res.json({
        output: `[MOCK AI] Pesan Anda diterima. Untuk mengaktifkan AI, set N8N_CHAT_WEBHOOK di .env backend.`,
        meta: buildMeta(res.locals.requestId),
      });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatInput: sanitizedMessage })
    });

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status}`);
    }

    const data = await response.json() as Record<string, unknown>;
    return res.json({
      data,
      meta: buildMeta(res.locals.requestId),
    });
  } catch (error) {
    console.error('[POST /api/ai-chat]', error);
    return res.status(500).json({
      error: 'AI Service Error',
      code: 'AI_SERVICE_ERROR',
      meta: buildMeta(res.locals.requestId),
    });
  }
});

// Estimator - File Upload & Processing
router.post('/api/estimator/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        meta: buildMeta(res.locals.requestId),
      });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const ext = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf('.'));

    interface PathData {
      id: string;
      d: string;
      length: number;
      selected: boolean;
    }

    let paths: PathData[] = [];
    let dimensions = { width: 0, height: 0 };
    let preview = '';

    if (ext === '.dxf') {
      // Parse DXF file
      try {
        const parser = new DxfParser();
        const dxf = parser.parseSync(fileContent);

        if (dxf && dxf.entities) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dxf.entities.forEach((entity: any, idx: number) => {
            let pathD = '';
            let length = 0;

            const entityType = entity.type;

            if (entityType === 'LINE') {
              const vertices = entity.vertices;
              const start = vertices?.[0] || { x: entity.x || 0, y: entity.y || 0 };
              const end = vertices?.[1] || { x: entity.x1 || 0, y: entity.y1 || 0 };
              pathD = `M${start.x},${start.y} L${end.x},${end.y}`;
              length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

              minX = Math.min(minX, start.x, end.x);
              minY = Math.min(minY, start.y, end.y);
              maxX = Math.max(maxX, start.x, end.x);
              maxY = Math.max(maxY, start.y, end.y);
            } else if (entityType === 'CIRCLE') {
              const cx = entity.center ? entity.center.x : (entity.x || 0);
              const cy = entity.center ? entity.center.y : (entity.y || 0);
              const r = entity.radius || 0;
              pathD = `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy}`;
              length = 2 * Math.PI * r;

              minX = Math.min(minX, cx - r);
              minY = Math.min(minY, cy - r);
              maxX = Math.max(maxX, cx + r);
              maxY = Math.max(maxY, cy + r);
            } else if (entityType === 'ARC') {
              const cx = entity.center ? entity.center.x : (entity.x || 0);
              const cy = entity.center ? entity.center.y : (entity.y || 0);
              const r = entity.radius || 0;
              const startAngle = (entity.startAngle || 0) * (Math.PI / 180);
              const endAngle = (entity.endAngle || 0) * (Math.PI / 180);

              const startX = cx + r * Math.cos(startAngle);
              const startY = cy + r * Math.sin(startAngle);
              const endX = cx + r * Math.cos(endAngle);
              const endY = cy + r * Math.sin(endAngle);

              const angleDiff = endAngle - startAngle;
              const largeArc = Math.abs(angleDiff) > Math.PI ? 1 : 0;

              pathD = `M${startX},${startY} A${r},${r} 0 ${largeArc},1 ${endX},${endY}`;
              length = r * Math.abs(angleDiff);

              minX = Math.min(minX, cx - r);
              minY = Math.min(minY, cy - r);
              maxX = Math.max(maxX, cx + r);
              maxY = Math.max(maxY, cy + r);
            } else if (entityType === 'LWPOLYLINE' || entityType === 'POLYLINE') {
              const vertices = entity.vertices;
              if (vertices && vertices.length > 0) {
                pathD = `M${vertices[0].x},${vertices[0].y}`;
                for (let i = 1; i < vertices.length; i++) {
                  pathD += ` L${vertices[i].x},${vertices[i].y}`;
                  length += Math.sqrt(
                    Math.pow(vertices[i].x - vertices[i - 1].x, 2) +
                    Math.pow(vertices[i].y - vertices[i - 1].y, 2)
                  );
                }
                if (entity.shape) {
                  pathD += ' Z';
                  length += Math.sqrt(
                    Math.pow(vertices[0].x - vertices[vertices.length - 1].x, 2) +
                    Math.pow(vertices[0].y - vertices[vertices.length - 1].y, 2)
                  );
                }

                vertices.forEach((v: { x: number; y: number }) => {
                  minX = Math.min(minX, v.x);
                  minY = Math.min(minY, v.y);
                  maxX = Math.max(maxX, v.x);
                  maxY = Math.max(maxY, v.y);
                });
              }
            } else if (entityType === 'SPLINE') {
              const controlPoints = entity.controlPoints;
              if (controlPoints && controlPoints.length > 0) {
                pathD = `M${controlPoints[0].x},${controlPoints[0].y}`;
                for (let i = 1; i < controlPoints.length; i++) {
                  pathD += ` L${controlPoints[i].x},${controlPoints[i].y}`;
                  length += Math.sqrt(
                    Math.pow(controlPoints[i].x - controlPoints[i - 1].x, 2) +
                    Math.pow(controlPoints[i].y - controlPoints[i - 1].y, 2)
                  );
                }

                controlPoints.forEach((p: { x: number; y: number }) => {
                  minX = Math.min(minX, p.x);
                  minY = Math.min(minY, p.y);
                  maxX = Math.max(maxX, p.x);
                  maxY = Math.max(maxY, p.y);
                });
              }
            }

            if (pathD) {
              paths.push({
                id: `dxf-path-${idx}`,
                d: pathD,
                length,
                selected: true,
              });
            }
          });

          // Calculate dimensions
          if (minX !== Infinity) {
            dimensions = {
              width: maxX - minX,
              height: maxY - minY,
            };

            // Generate SVG preview
            const padding = 10;
            const svgWidth = dimensions.width + padding * 2;
            const svgHeight = dimensions.height + padding * 2;

            let svgPaths = paths.map(p => {
              // Translate path to start from padding
              return `<path d="${p.d}" fill="none" stroke="#3b82f6" stroke-width="1" transform="translate(${-minX + padding}, ${-minY + padding})"/>`;
            }).join('\n');

            preview = `data:image/svg+xml;base64,${Buffer.from(
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">${svgPaths}</svg>`
            ).toString('base64')}`;
          }
        }
      } catch (parseError) {
        console.error('DXF parse error:', parseError);
        return res.status(400).json({
          success: false,
          error: 'Failed to parse DXF file',
          meta: buildMeta(res.locals.requestId),
        });
      }
    } else if (ext === '.svg') {
      // For SVG, we just return the content as base64
      preview = `data:image/svg+xml;base64,${Buffer.from(fileContent).toString('base64')}`;

      // Parse SVG to extract dimensions and paths (basic extraction)
      const viewBoxMatch = fileContent.match(/viewBox="([^"]+)"/);
      const widthMatch = fileContent.match(/width="([^"]+)"/);
      const heightMatch = fileContent.match(/height="([^"]+)"/);

      if (viewBoxMatch) {
        const [, , , w, h] = viewBoxMatch[1].split(/\s+/).map(Number);
        dimensions = { width: w || 100, height: h || 100 };
      } else if (widthMatch && heightMatch) {
        dimensions = {
          width: parseFloat(widthMatch[1]) || 100,
          height: parseFloat(heightMatch[1]) || 100,
        };
      }

      // Extract paths from SVG
      const pathMatches = fileContent.matchAll(/<path[^>]*d="([^"]+)"[^>]*\/?>/gi);
      let idx = 0;
      for (const match of pathMatches) {
        paths.push({
          id: `svg-path-${idx++}`,
          d: match[1],
          length: estimatePathLength(match[1]),
          selected: true,
        });
      }
    } else if (ext === '.pdf') {
      try {
        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(req.file.buffer),
          // Disable font face to prevent font loading errors in Node environment
          disableFontFace: true,
          // Use standard fonts from the package if possible, or ignore
          standardFontDataUrl: './node_modules/pdfjs-dist/standard_fonts/', 
        });

        const doc = await loadingTask.promise;
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        
        // Use factory to create canvas
        const factory = new NodeCanvasFactory();
        const canvasAndContext = factory.create(viewport.width, viewport.height);

        await page.render({
          canvasContext: canvasAndContext.context,
          viewport: viewport,
          canvasFactory: factory,
        }).promise;

        const pngBuffer = canvasAndContext.canvas.toBuffer('image/png');
        
        // Trace the rendered PDF page
        const tracedSvg = await new Promise<string>((resolve, reject) => {
          potrace.trace(pngBuffer, {
            threshold: 128,
            turdSize: 2,
            optTolerance: 0.2,
          }, (err, svg) => {
            if (err) reject(err);
            else resolve(svg);
          });
        });

        // Extract paths
        const pathMatches = tracedSvg.matchAll(/<path[^>]*d="([^"]+)"[^>]*\/?>/gi);
        let idx = 0;
        for (const match of pathMatches) {
          paths.push({
            id: `pdf-path-${idx++}`,
            d: match[1],
            length: estimatePathLength(match[1]),
            selected: true,
          });
        }

        // Extract dimensions
        const widthMatch = tracedSvg.match(/width="([^"]+)"/);
        const heightMatch = tracedSvg.match(/height="([^"]+)"/);
        if (widthMatch && heightMatch) {
          dimensions = {
            width: parseFloat(widthMatch[1]) || 100,
            height: parseFloat(heightMatch[1]) || 100,
          };
        }

        preview = `data:image/svg+xml;base64,${Buffer.from(tracedSvg).toString('base64')}`;
      } catch (pdfError) {
        console.error('PDF processing failed:', pdfError);
        return res.status(400).json({
          success: false,
          error: 'Failed to process PDF file. Ensure it is a valid PDF document.',
          meta: buildMeta(res.locals.requestId),
        });
      }
    } else {
      // For images, use potrace to trace and convert to SVG paths
      const mimeType = req.file.mimetype || 'image/png';

      try {
        // Use potrace to trace the image
        const tracedSvg = await new Promise<string>((resolve, reject) => {
          potrace.trace(req.file!.buffer, {
            threshold: 128,
            turdSize: 2,
            optTolerance: 0.2,
          }, (err: Error | null, svg: string) => {
            if (err) reject(err);
            else resolve(svg);
          });
        });

        // Extract paths from the traced SVG
        const pathMatches = tracedSvg.matchAll(/<path[^>]*d="([^"]+)"[^>]*\/?>/gi);
        let idx = 0;
        for (const match of pathMatches) {
          paths.push({
            id: `img-path-${idx++}`,
            d: match[1],
            length: estimatePathLength(match[1]),
            selected: true,
          });
        }

        // Extract dimensions from traced SVG
        const widthMatch = tracedSvg.match(/width="([^"]+)"/);
        const heightMatch = tracedSvg.match(/height="([^"]+)"/);
        if (widthMatch && heightMatch) {
          dimensions = {
            width: parseFloat(widthMatch[1]) || 100,
            height: parseFloat(heightMatch[1]) || 100,
          };
        }

        // Use traced SVG as preview
        preview = `data:image/svg+xml;base64,${Buffer.from(tracedSvg).toString('base64')}`;
      } catch (traceError) {
        console.error('Image tracing failed:', traceError);
        // Fallback to original image if tracing fails
        preview = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;
      }
    }

    return res.json({
      success: true,
      preview,
      paths,
      dimensions,
      meta: buildMeta(res.locals.requestId),
    });
  } catch (error) {
    console.error('[POST /api/estimator/upload]', error);
    return res.status(500).json({
      success: false,
      error: 'File processing failed',
      meta: buildMeta(res.locals.requestId),
    });
  }
});

// Helper function to estimate path length from SVG path data
function estimatePathLength(d: string): number {
  const commands = d.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
  let length = 0;
  let lastX = 0, lastY = 0;
  let startX = 0, startY = 0;

  commands.forEach(cmd => {
    const type = cmd[0].toUpperCase();
    const coords = cmd.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number);

    switch (type) {
      case 'M':
        if (coords.length >= 2) {
          lastX = coords[0];
          lastY = coords[1];
          startX = lastX;
          startY = lastY;
        }
        break;
      case 'L':
        if (coords.length >= 2) {
          length += Math.sqrt(Math.pow(coords[0] - lastX, 2) + Math.pow(coords[1] - lastY, 2));
          lastX = coords[0];
          lastY = coords[1];
        }
        break;
      case 'H':
        if (coords.length >= 1) {
          length += Math.abs(coords[0] - lastX);
          lastX = coords[0];
        }
        break;
      case 'V':
        if (coords.length >= 1) {
          length += Math.abs(coords[0] - lastY);
          lastY = coords[0];
        }
        break;
      case 'C':
        if (coords.length >= 6) {
          // Cubic bezier - approximate with chord length * factor
          length += Math.sqrt(Math.pow(coords[4] - lastX, 2) + Math.pow(coords[5] - lastY, 2)) * 1.3;
          lastX = coords[4];
          lastY = coords[5];
        }
        break;
      case 'Q':
        if (coords.length >= 4) {
          // Quadratic bezier - approximate
          length += Math.sqrt(Math.pow(coords[2] - lastX, 2) + Math.pow(coords[3] - lastY, 2)) * 1.2;
          lastX = coords[2];
          lastY = coords[3];
        }
        break;
      case 'A':
        if (coords.length >= 7) {
          // Arc - approximate with distance * pi/2
          const endX = coords[5];
          const endY = coords[6];
          const rx = coords[0];
          const ry = coords[1];
          const avgR = (rx + ry) / 2;
          length += avgR * Math.PI; // Rough approximation
          lastX = endX;
          lastY = endY;
        }
        break;
      case 'Z':
        length += Math.sqrt(Math.pow(startX - lastX, 2) + Math.pow(startY - lastY, 2));
        lastX = startX;
        lastY = startY;
        break;
    }
  });

  return length;
}

export default router;
