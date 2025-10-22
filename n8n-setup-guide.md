# 🔗 N8N Workflow Setup Guide untuk CRM Integration

Panduan lengkap untuk mengintegrasikan CRM Dashboard dengan N8N workflow menggunakan webhook bidirectional.

## 📋 Overview

CRM Dashboard akan berkomunikasi dengan N8N workflow melalui webhook untuk:
- ✅ Mengambil data dari PostgreSQL database
- ✅ Mengirim WhatsApp messages
- ✅ Update status customer/leads 
- ✅ Trigger marketing campaigns
- ✅ Handle escalations

## 🎯 Webhook URLs yang Dibutuhkan

### 1. CRM to N8N Webhook
```
URL: https://projek-n8n-n8n.qk6yxt.easypanel.host/webhook/crm
Method: POST
Headers: Content-Type: application/json
```

### 2. N8N Response Webhook (Optional)
```
URL: https://projek-n8n-n8n.qk6yxt.easypanel.host/webhook/crm-response  
Method: POST
Headers: Content-Type: application/json
```

## 📝 Request Format dari CRM

CRM Dashboard akan mengirim request dengan format berikut:

```json
{
  "request_id": "req_1698123456_abc123",
  "source": "crm_dashboard",
  "action": "get_customers", 
  "timestamp": "2024-10-22T10:30:00.000Z",
  "data": {
    "filters": {
      "search": "jakarta",
      "status": "active"
    }
  }
}
```

## 🔧 Actions yang Didukung

### 📊 Data Retrieval Actions

#### 1. `get_quick_stats`
```json
{
  "action": "get_quick_stats",
  "data": {}
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalCustomers": 125,
    "totalLeads": 89, 
    "totalEscalations": 3,
    "responseRate": 87
  }
}
```

#### 2. `get_customers`
```json
{
  "action": "get_customers",
  "data": {
    "filters": {
      "search": "string (optional)",
      "status": "active|cooldown|escalated (optional)"
    }
  }
}
```

#### 3. `get_leads`
```json
{
  "action": "get_leads", 
  "data": {
    "filters": {
      "segment": "advertising_signage|metal_fabrication|etc",
      "status": "new|contacted|invalid_whatsapp",
      "leadScore": "high|medium|low"
    }
  }
}
```

#### 4. `get_escalations`
```json
{
  "action": "get_escalations",
  "data": {
    "filters": {
      "status": "open|in_progress|closed",
      "priority": "urgent|high|medium|normal"
    }
  }
}
```

#### 5. `get_recent_chats`
```json
{
  "action": "get_recent_chats",
  "data": {
    "limit": 10
  }
}
```

#### 6. `get_recent_activities`
```json
{
  "action": "get_recent_activities",
  "data": {
    "limit": 20
  }
}
```

### 📱 WhatsApp Actions

#### 7. `send_whatsapp_message`
```json
{
  "action": "send_whatsapp_message",
  "data": {
    "phone": "6281234567890",
    "message": "Hello from CRM!",
    "type": "text"
  }
}
```

#### 8. `contact_lead`
```json
{
  "action": "contact_lead",
  "data": {
    "phone": "6281234567890",
    "name": "PT ABC", 
    "message": "Marketing message"
  }
}
```

#### 9. `bulk_contact_leads`
```json
{
  "action": "bulk_contact_leads",
  "data": {
    "lead_ids": [1, 2, 3, 4, 5],
    "message": "Bulk marketing message"
  }
}
```

### ⚡ Action Commands

#### 10. `resolve_escalation`
```json
{
  "action": "resolve_escalation",
  "data": {
    "escalation_id": 123
  }
}
```

#### 11. `update_customer_status`
```json
{
  "action": "update_customer_status",
  "data": {
    "customer_id": 456,
    "status": "active|cooldown|escalated"
  }
}
```

#### 12. `health_check`
```json
{
  "action": "health_check",
  "data": {}
}
```

## 🏗️ N8N Workflow Structure

### 1. Webhook Trigger Node
```
Node: Webhook
HTTP Method: POST
Path: /webhook/crm
Authentication: None (atau sesuai kebutuhan)
Response Mode: Respond to Webhook
```

### 2. Switch Node - Action Router
```
Node: Switch
Mode: Rules

Rules:
- action = "get_quick_stats" → Route 1
- action = "get_customers" → Route 2  
- action = "get_leads" → Route 3
- action = "send_whatsapp_message" → Route 4
- etc...
```

### 3. PostgreSQL Nodes
```
Node: Postgres
Operation: Execute Query
Query: SELECT * FROM customers WHERE ...
Parameters: {{ $json.data.filters }}
```

### 4. WhatsApp API Nodes
```
Node: HTTP Request
Method: GET
URL: https://app.notif.my.id/api/v2/send-message
Query Parameters:
- apikey: mm68fx5IvP2GIb2Wjq1760330685167
- mtype: text
- receiver: {{ $json.data.phone }}
- text: {{ $json.data.message }}
```

### 5. Response Formatting Node
```
Node: Set
Operations:
- success: true
- data: {{ $json }}
- request_id: {{ $node["Webhook"].json.request_id }}
- timestamp: {{ new Date().toISOString() }}
```

## 🔍 Contoh N8N Workflow (JSON)

```json
{
  "nodes": [
    {
      "parameters": {
        "path": "crm",
        "responseMode": "respondToWebhook",
        "options": {}
      },
      "name": "CRM Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [200, 300]
    },
    {
      "parameters": {
        "rules": {
          "rules": [
            {
              "conditions": [
                {
                  "leftValue": "{{ $json.action }}",
                  "rightValue": "get_quick_stats",
                  "operator": {
                    "type": "string",
                    "operation": "equals"
                  }
                }
              ]
            },
            {
              "conditions": [
                {
                  "leftValue": "{{ $json.action }}", 
                  "rightValue": "get_customers",
                  "operator": {
                    "type": "string",
                    "operation": "equals"
                  }
                }
              ]
            },
            {
              "conditions": [
                {
                  "leftValue": "{{ $json.action }}",
                  "rightValue": "send_whatsapp_message",
                  "operator": {
                    "type": "string", 
                    "operation": "equals"
                  }
                }
              ]
            }
          ]
        }
      },
      "name": "Action Router",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 1, 
      "position": [400, 300]
    }
  ]
}
```

## 📊 Database Query Examples

### Get Quick Stats
```sql
-- Total Customers
SELECT COUNT(*) as total FROM customers;

-- Total Leads 
SELECT COUNT(*) as total FROM businesses WHERE has_phone = true;

-- Total Escalations
SELECT COUNT(*) as total FROM escalations WHERE status = 'open';

-- Response Rate
SELECT 
  COUNT(CASE WHEN message_sent = true AND status = 'contacted' THEN 1 END) * 100.0 / 
  COUNT(CASE WHEN message_sent = true THEN 1 END) as response_rate
FROM businesses;
```

### Get Customers with Filters
```sql
SELECT 
  id, phone, name, location, conversation_stage, 
  last_interaction, is_cooldown_active, message_count
FROM customers 
WHERE 1=1
  AND ($1 = '' OR name ILIKE '%' || $1 || '%' OR phone ILIKE '%' || $1 || '%')
  AND ($2 = '' OR 
    CASE $2 
      WHEN 'active' THEN is_cooldown_active = false
      WHEN 'cooldown' THEN is_cooldown_active = true 
      WHEN 'escalated' THEN id IN (SELECT customer_id FROM escalations WHERE status = 'open')
      ELSE true
    END)
ORDER BY last_interaction DESC
LIMIT 100;
```

### Get Recent Chats
```sql
SELECT 
  ch.id, ch.customer_id, ch.message_type, ch.content,
  ch.classification, ch.created_at,
  c.name as customer_name, c.phone as customer_phone
FROM chat_history ch
LEFT JOIN customers c ON ch.customer_id = c.id
ORDER BY ch.created_at DESC
LIMIT $1;
```

## 🔧 Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "request_id": "req_1698123456_abc123",
  "timestamp": "2024-10-22T10:30:00.000Z"
}
```

### Common Error Cases
1. **Database Connection Failed**
   - Check PostgreSQL credentials
   - Verify network connectivity
   
2. **Invalid Action**
   - Unknown action parameter
   - Missing required data fields
   
3. **WhatsApp API Error**
   - Invalid phone number format
   - API key expired or invalid
   - Rate limit exceeded

## 🧪 Testing Webhooks

### Test dengan cURL
```bash
# Test Quick Stats
curl -X POST https://projek-n8n-n8n.qk6yxt.easypanel.host/webhook/crm \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "test_123",
    "source": "crm_dashboard", 
    "action": "get_quick_stats",
    "timestamp": "2024-10-22T10:30:00.000Z",
    "data": {}
  }'

# Test WhatsApp Message
curl -X POST https://projek-n8n-n8n.qk6yxt.easypanel.host/webhook/crm \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "test_456",
    "source": "crm_dashboard",
    "action": "send_whatsapp_message", 
    "timestamp": "2024-10-22T10:30:00.000Z",
    "data": {
      "phone": "6281234567890",
      "message": "Test message from CRM",
      "type": "text"
    }
  }'
```

## 📈 Performance Optimization

### 1. Database Indexing
```sql
-- Index untuk customers
CREATE INDEX idx_customers_last_interaction ON customers(last_interaction DESC);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(name);

-- Index untuk chat_history
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);
CREATE INDEX idx_chat_history_customer_id ON chat_history(customer_id);

-- Index untuk businesses (leads)
CREATE INDEX idx_businesses_has_phone ON businesses(has_phone) WHERE has_phone = true;
CREATE INDEX idx_businesses_market_segment ON businesses(market_segment);
CREATE INDEX idx_businesses_lead_score ON businesses(lead_score DESC);
```

### 2. N8N Workflow Optimization
- Use **Merge Node** untuk combine data dari multiple sources
- Implement **timeout** untuk database queries (30 seconds)
- Use **Cache Node** untuk frequently accessed data
- Implement **rate limiting** untuk WhatsApp API calls

## 🔒 Security Considerations

### 1. Webhook Security
```javascript
// Validate request source
if ($json.source !== 'crm_dashboard') {
  throw new Error('Invalid request source');
}

// Validate timestamp (reject old requests)
const requestTime = new Date($json.timestamp);
const now = new Date();
const timeDiff = Math.abs(now - requestTime);
if (timeDiff > 300000) { // 5 minutes
  throw new Error('Request too old');
}
```

### 2. Database Security
- Use **prepared statements** untuk prevent SQL injection
- Implement **connection pooling** untuk better performance
- Use **read-only user** untuk data retrieval operations

## 🚀 Deployment Checklist

- [ ] **N8N Workflow** deployed dan active
- [ ] **Webhook URLs** accessible dari internet
- [ ] **PostgreSQL** connection working
- [ ] **WhatsApp API** credentials valid
- [ ] **Database indexes** created
- [ ] **Error handling** implemented
- [ ] **Rate limiting** configured
- [ ] **Monitoring** setup
- [ ] **Testing** completed

## 📞 Troubleshooting

### Common Issues

1. **CRM shows "N8N Disconnected"**
   - Check webhook URL accessibility
   - Verify N8N workflow is active
   - Test with cURL command

2. **Database queries timeout**
   - Check PostgreSQL connection
   - Verify database credentials 
   - Check query performance

3. **WhatsApp messages not sent**
   - Verify API key validity
   - Check phone number format
   - Monitor rate limits

4. **No data returned**
   - Check database table structure
   - Verify query syntax
   - Check data availability

---

## 🎯 Result

Setelah setup selesai, CRM Dashboard akan bisa:
- ✅ **Real-time data** dari PostgreSQL
- ✅ **Send WhatsApp** messages directly
- ✅ **Update customer** status via workflow
- ✅ **Handle escalations** automatically
- ✅ **Monitor performance** dengan live metrics

**Dashboard akan menampilkan data real-time dan tombol Refresh Data akan berfungsi dengan sempurna!** 🚀