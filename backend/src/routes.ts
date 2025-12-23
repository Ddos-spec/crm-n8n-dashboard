import { Router } from 'express';
import { pool } from './lib/db';
import { config } from './config/env';

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

// AI Chat Proxy
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

export default router;
