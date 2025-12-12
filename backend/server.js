import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import pool, { testConnection, query } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://ddos-spec.github.io',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all origins for now, log for debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware with CORS debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Origin:', req.headers.origin);
  console.log('Headers:', req.headers);
  next();
});

// Explicit OPTIONS handler for preflight requests
app.options('*', cors(corsOptions));

// ==================== ROOT & HEALTH CHECK ====================
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'CRM Backend is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'ok',
    database: dbStatus
  });
});

// ==================== DASHBOARD STATISTICS ====================
app.get('/api/stats', async (req, res) => {
  try {
    // 1. Basic Counts
    const totalCustomers = await query('SELECT COUNT(*) as total FROM customers');
    const totalLeads = await query('SELECT COUNT(*) as total FROM businesses WHERE has_phone = true');
    const openEscalations = await query("SELECT COUNT(*) as total FROM escalations WHERE status = 'open'");
    const todayChats = await query(`
      SELECT COUNT(*) as total FROM chat_history
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    // 2. Total Messages
    const totalMessagesResult = await query('SELECT SUM(total_messages) as total FROM customers');
    const totalMessages = totalMessagesResult.rows[0].total || 0;

    // 3. Customers by Priority
    const customersByPriority = await query(`
      SELECT customer_priority, COUNT(*) as count
      FROM customers
      GROUP BY customer_priority
    `);

    // 4. Leads by Status
    const leadsByStatus = await query(`
      SELECT status, COUNT(*) as count
      FROM businesses
      WHERE has_phone = true
      GROUP BY status
    `);

    // 5. Customer Trend (Last 7 Days)
    const customerTrend = await query(`
      SELECT TO_CHAR(created_at, 'Mon DD') as date, COUNT(*) as count
      FROM customers
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'Mon DD'), DATE(created_at)
      ORDER BY DATE(created_at)
    `);

    // 6. Message Distribution
    const messageDistribution = await query(`
      SELECT range, COUNT(*) as count
      FROM (
        SELECT
          CASE
            WHEN total_messages <= 10 THEN '0-10'
            WHEN total_messages <= 20 THEN '11-20'
            WHEN total_messages <= 50 THEN '21-50'
            WHEN total_messages <= 100 THEN '51-100'
            ELSE '100+'
          END as range
        FROM customers
      ) as ranges
      GROUP BY range
      ORDER BY
        CASE range
          WHEN '0-10' THEN 1
          WHEN '11-20' THEN 2
          WHEN '21-50' THEN 3
          WHEN '51-100' THEN 4
          ELSE 5
        END
    `);

    // 7. Top 5 Customers
    const topCustomers = await query(`
      SELECT id, name, phone, total_messages as message_count
      FROM customers
      ORDER BY total_messages DESC NULLS LAST
      LIMIT 5
    `);

    // 8. Top 5 Leads
    const topLeads = await query(`
      SELECT id, name, market_segment, lead_score
      FROM businesses
      WHERE has_phone = true
      ORDER BY lead_score DESC NULLS LAST
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        total_customers: parseInt(totalCustomers.rows[0].total),
        total_leads: parseInt(totalLeads.rows[0].total),
        open_escalations: parseInt(openEscalations.rows[0].total),
        today_chats: parseInt(todayChats.rows[0].total),
        total_messages: parseInt(totalMessages),
        customers_by_priority: customersByPriority.rows,
        leads_by_status: leadsByStatus.rows,
        customer_trend: customerTrend.rows,
        message_distribution: messageDistribution.rows,
        top_customers: topCustomers.rows,
        top_leads: topLeads.rows
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CUSTOMERS ====================
app.get('/api/customers', async (req, res) => {
  try {
    const { search, priority, date_from, date_to, limit = 100, offset = 0 } = req.query;

    let queryText = `
      SELECT
        id, phone, name, location, conversation_stage,
        last_interaction, is_cooldown_active, message_count_today,
        customer_priority, created_at, total_messages
      FROM customers
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (search) {
      queryText += ` AND (name ILIKE $${paramCount} OR phone ILIKE $${paramCount + 1})`;
      params.push(`%${search}%`, `%${search}%`);
      paramCount += 2;
    }

    if (priority) {
      queryText += ` AND customer_priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    if (date_from) {
      queryText += ` AND DATE(created_at) >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      queryText += ` AND DATE(created_at) <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    queryText += ` ORDER BY last_interaction DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM customers WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    if (search) {
      countQuery += ` AND (name ILIKE $${countParamIndex} OR phone ILIKE $${countParamIndex + 1})`;
      countParams.push(`%${search}%`, `%${search}%`);
      countParamIndex += 2;
    }

    if (priority) {
      countQuery += ` AND customer_priority = $${countParamIndex}`;
      countParams.push(priority);
      countParamIndex++;
    }

    if (date_from) {
      countQuery += ` AND DATE(created_at) >= $${countParamIndex}`;
      countParams.push(date_from);
      countParamIndex++;
    }

    if (date_to) {
      countQuery += ` AND DATE(created_at) <= $${countParamIndex}`;
      countParams.push(date_to);
      countParamIndex++;
    }

    const countResult = await query(countQuery, countParams);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const result = await query('SELECT * FROM customers WHERE id = $1', [customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CHAT HISTORY ====================
app.get('/api/chat-history/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { limit = 50 } = req.query;

    // Get customer info
    const customerResult = await query(
      'SELECT id, phone, name FROM customers WHERE id = $1',
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    // Get chat history
    const chatResult = await query(
      `SELECT
        id, message_type, content, escalated,
        classification, created_at
      FROM chat_history
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
      [customerId, parseInt(limit)]
    );

    res.json({
      success: true,
      customer: customerResult.rows[0],
      chats: chatResult.rows
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/send-whatsapp', async (req, res) => {
  try {
    const { phone, message, customer_id } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'Phone and message required' });
    }

    // Format phone number for WhatsApp
    let formattedPhone = phone;
    if (!phone.endsWith('@s.whatsapp.net')) {
      formattedPhone = `${phone}@s.whatsapp.net`;
    }

    // Send via WhatsApp API
    const whatsappUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;

    let whatsappResponse = null;
    try {
      const response = await axios.get(whatsappUrl, {
        params: {
          apikey: apiKey,
          mtype: 'text',
          receiver: formattedPhone,
          text: message
        },
        timeout: 30000
      });
      whatsappResponse = response.data;
    } catch (apiError) {
      console.error('WhatsApp API error:', apiError.message);
    }

    // Save to chat history if customer_id provided
    if (customer_id) {
      await query(
        `INSERT INTO chat_history
        (customer_id, message_type, content, sent_via, created_at)
        VALUES ($1, $2, $3, $4, NOW())`,
        [customer_id, 'outgoing', message, 'api']
      );
    }

    res.json({
      success: true,
      message: 'Pesan berhasil dikirim',
      whatsapp_response: whatsappResponse
    });
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== BUSINESSES/LEADS ====================
app.get('/api/businesses', async (req, res) => {
  try {
    const { search, status, date_from, date_to, limit = 100, offset = 0 } = req.query;

    let queryText = `
      SELECT
        id, name, phone, formatted_phone_number, address,
        market_segment, lead_score, status, rating,
        user_ratings_total, contact_attempts, last_contacted,
        message_sent, created_at
      FROM businesses
      WHERE has_phone = true
    `;
    const params = [];
    let paramCount = 1;

    if (search) {
      queryText += ` AND (name ILIKE $${paramCount} OR phone ILIKE $${paramCount + 1} OR address ILIKE $${paramCount + 2})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      paramCount += 3;
    }

    if (status) {
      queryText += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (date_from) {
      queryText += ` AND DATE(created_at) >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      queryText += ` AND DATE(created_at) <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    queryText += ` ORDER BY lead_score DESC, created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM businesses WHERE has_phone = true';
    const countParams = [];
    let countIndex = 1;

    if (search) {
      countQuery += ` AND (name ILIKE $${countIndex} OR phone ILIKE $${countIndex + 1} OR address ILIKE $${countIndex + 2})`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      countIndex += 3;
    }

    if (status) {
      countQuery += ` AND status = $${countIndex}`;
      countParams.push(status);
      countIndex++;
    }

    if (date_from) {
      countQuery += ` AND DATE(created_at) >= $${countIndex}`;
      countParams.push(date_from);
      countIndex++;
    }

    if (date_to) {
      countQuery += ` AND DATE(created_at) <= $${countIndex}`;
      countParams.push(date_to);
      countIndex++;
    }

    const countResult = await query(countQuery, countParams);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ESCALATIONS ====================
app.get('/api/escalations', async (req, res) => {
  try {
    const { status_filter, priority, limit = 100 } = req.query;

    let queryText = `
      SELECT
        e.id, e.customer_id, e.escalation_type, e.priority_level, e.status,
        e.escalation_reason, e.created_at,
        c.name as customer_name, c.phone as customer_phone
      FROM escalations e
      LEFT JOIN customers c ON e.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status_filter) {
      queryText += ` AND e.status = $${paramCount}`;
      params.push(status_filter);
      paramCount++;
    }

    if (priority) {
      queryText += ` AND e.priority_level = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    queryText += `
      ORDER BY
        CASE e.priority_level
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          ELSE 3
        END,
        e.created_at DESC
      LIMIT $${paramCount}
    `;
    params.push(parseInt(limit));

    const result = await query(queryText, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching escalations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/escalations/:escalationId/resolve', async (req, res) => {
  try {
    const { escalationId } = req.params;

    const result = await query(
      `UPDATE escalations
      SET status = 'resolved',
          resolved_at = NOW(),
          response_time_minutes = EXTRACT(EPOCH FROM (NOW() - created_at))/60
      WHERE id = $1
      RETURNING *`,
      [escalationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Escalation not found' });
    }

    res.json({
      success: true,
      message: 'Eskalasi berhasil diselesaikan',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error resolving escalation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EXPORT TO CSV ====================
app.get('/api/export/customers', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        id, phone, name, location, conversation_stage,
        customer_priority, message_count_today, total_messages,
        created_at, last_interaction
      FROM customers
      ORDER BY created_at DESC
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No data to export' });
    }

    // Create CSV
    const headers = Object.keys(result.rows[0]).join(',');
    const rows = result.rows.map(row =>
      Object.values(row).map(val =>
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting customers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/export/businesses', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        id, name, phone, address, market_segment, lead_score,
        status, rating, contact_attempts, message_sent, created_at
      FROM businesses
      WHERE has_phone = true
      ORDER BY created_at DESC
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No data to export' });
    }

    // Create CSV
    const headers = Object.keys(result.rows[0]).join(',');
    const rows = result.rows.map(row =>
      Object.values(row).map(val =>
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting businesses:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/export/chat-history', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        ch.id, c.name as customer_name, c.phone as customer_phone,
        ch.message_type, ch.content, ch.classification, ch.created_at
      FROM chat_history ch
      LEFT JOIN customers c ON ch.customer_id = c.id
      ORDER BY ch.created_at DESC
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No data to export' });
    }

    // Create CSV
    const headers = Object.keys(result.rows[0]).join(',');
    const rows = result.rows.map(row =>
      Object.values(row).map(val =>
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=chat_history.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting chat history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Error Handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ success: false, error: error.message });
});

// Start server
async function startServer() {
  try {
    // Test database connection first
    console.log('🚀 Starting up application...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ Database connection failed. Please check your configuration.');
      process.exit(1);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
      console.log(`📊 API Documentation:`);
      console.log(`   - GET  /api/health - Health check`);
      console.log(`   - GET  /api/stats - Dashboard statistics`);
      console.log(`   - GET  /api/customers - List customers`);
      console.log(`   - GET  /api/businesses - List businesses/leads`);
      console.log(`   - GET  /api/escalations - List escalations`);
      console.log(`   - GET  /api/chat-history/:customerId - Get chat history`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
