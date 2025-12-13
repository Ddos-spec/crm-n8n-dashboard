import { Router } from 'express';
import { pool } from './lib/db';
import { config } from './config/env';

const router = Router();

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

    const getMonthCount = async (table: string, dateCol: string, where = '') => {
      const q = `
        SELECT 
          COUNT(*) FILTER (WHERE date_trunc('month', ${dateCol}) = date_trunc('month', CURRENT_DATE))::int as curr,
          COUNT(*) FILTER (WHERE date_trunc('month', ${dateCol}) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month'))::int as prev
        FROM ${table}
        ${where ? 'WHERE ' + where : ''}
      `;
      const res = await pool.query(q);
      return { curr: res.rows[0].curr, prev: res.rows[0].prev };
    };

    // 1. Total Customers (All Time) + Trend (Active Monthly)
    const totalCustRes = await pool.query('SELECT COUNT(*)::int as count FROM customers');
    const custTrendStats = await getMonthCount('customers', 'last_message_at'); 
    const custTrend = calcTrend(custTrendStats.curr, custTrendStats.prev);

    // 2. Total Chats (All Time) + Trend (Monthly Volume)
    const totalChatRes = await pool.query('SELECT COUNT(*)::int as count FROM chat_history');
    const chatTrendStats = await getMonthCount('chat_history', 'created_at');
    const chatTrend = calcTrend(chatTrendStats.curr, chatTrendStats.prev);
    const chatTrend = calcTrend(chatTrendStats.curr, chatTrendStats.prev);

    // 3. Open Escalations (Current Snapshot) + Trend (New Escalations Month vs Month)
    const openEscRes = await pool.query("SELECT COUNT(*)::int as count FROM escalations WHERE status = 'open'");
    const escTrendStats = await getMonthCount('escalations', 'created_at'); // Trend of NEW escalations
    const escTrend = calcTrend(escTrendStats.curr, escTrendStats.prev);

    // 4. Leads (This Month) + Trend (vs Last Month)
    const leadsTrendStats = await getMonthCount('businesses', 'created_at');
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
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);
    const search = req.query.search ? String(req.query.search) : null;

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
    
    // Get total count for meta info (optional but good practice)
    // const countRes = await pool.query('SELECT COUNT(*)::int as count FROM customers');

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
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);
    const status = req.query.status ? String(req.query.status) : null;
    const search = req.query.search ? String(req.query.search) : null;

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

export default router;
