# 📊 CRM Dashboard Tepat Laser - Live Database Integration

**Dashboard CRM terintegrasi real-time** untuk mengelola workflow customer service dan marketing automation PT Tepat Laser dengan koneksi langsung ke PostgreSQL database dan N8N workflows.

## 🏁 Status: PRODUCTION READY

✅ **Database Connected**: PostgreSQL (`postgres_scrapdatan8n`)
✅ **N8N Integration**: Workflow `C92dXduOKH38M3pj` 
✅ **WhatsApp API**: Live integration 
✅ **Real-time Updates**: 30-second refresh intervals
✅ **Webhook Integration**: Bidirectional N8N communication

---

## 🚀 Quick Start (Production)

### 1. Clone & Setup
```bash
git clone https://github.com/Ddos-spec/crm-n8n-dashboard.git
cd crm-n8n-dashboard
```

### 2. Database Setup (Already Configured)
📝 **Database sudah terkonfigurasi dengan credentials:**
- **Host**: `postgres_scrapdatan8n`
- **Port**: `5432`
- **Database**: `postgres`
- **Username**: `postgres`
- **Password**: `a0bd3b3c1d54b7833014`

### 3. Web Server Setup

**Option A: PHP Development Server**
```bash
php -S localhost:8000
```

**Option B: Apache/Nginx**
- Copy files to web directory
- Ensure PHP 7.4+ with PDO PostgreSQL extension
- Point domain to `index.html`

### 4. Access Dashboard
- **Local**: http://localhost:8000
- **Live**: https://ddos-spec.github.io/crm-n8n-dashboard/

---

## 📊 Fitur Utama

### 📞 Real-time Customer Service
- **Live Chat Monitor**: Monitor percakapan AI Agent real-time
- **Escalation Management**: Handle urgent customer cases
- **Customer Database**: Kelola data pelanggan lengkap
- **Cooldown System**: Otomatis manage message frequency

### 📱 Marketing Automation
- **Lead Database**: 500+ leads dari Google Places scraping
- **Campaign Tracking**: Monitor WhatsApp campaign performance
- **Bulk Operations**: Contact multiple leads simultaneously
- **Segmentation**: Filter leads by market segment & score

### 📈 Analytics & Reporting
- **AI Performance**: Classification accuracy & confidence
- **Interaction Trends**: Visual data trends over time
- **Response Metrics**: Average response time tracking
- **Conversion Analytics**: Marketing to sales funnel

---

## 🔗 Integration Architecture

### Database Schema (PostgreSQL)
```sql
-- Customer Service Tables
customers           -- Customer data & conversation state
chat_history        -- All WhatsApp conversations 
escalations        -- Urgent cases requiring human attention
knowledge_ai       -- AI Agent knowledge base

-- Marketing Tables  
businesses         -- Lead database from Google Places
campaign_performance -- Marketing campaign analytics
customer_engagement_stats -- Customer interaction statistics
```

### N8N Workflow Integration
- **Workflow ID**: `C92dXduOKH38M3pj`
- **Webhook URL**: `https://projek-n8n-n8n.qk6yxt.easypanel.host/webhook/crm`
- **Bidirectional**: CRM ↔️ N8N data sync
- **Real-time**: Instant updates on actions

### WhatsApp API Integration
- **Provider**: app.notif.my.id
- **Real-time messaging**: Send/receive WhatsApp messages
- **Group notifications**: Admin escalation alerts
- **Campaign automation**: Bulk marketing messages

---

## 🔧 Technical Implementation

### Frontend Stack
- **HTML5/CSS3**: Modern responsive design
- **Tailwind CSS**: Utility-first styling
- **Vanilla JavaScript**: No framework dependencies
- **Plotly.js**: Interactive charts & analytics
- **Font Awesome**: Icon library

### Backend Integration  
- **PHP 7.4+**: Server-side API (`server-api.php`)
- **PDO PostgreSQL**: Database connectivity
- **REST API**: JSON-based communication
- **Error Handling**: Graceful fallbacks
- **Caching**: 30-second cache for performance

### File Structure
```
crm-n8n-dashboard/
├── index.html           # Main dashboard interface
├── dashboard.js         # Frontend logic & UI
├── api-connector.js     # API integration layer  
├── config.js           # Configuration & credentials
├── server-api.php      # Backend API for database
└── README.md           # Documentation
```

---

## ⚙️ Configuration Details

### Database Configuration
```javascript
database: {
    host: 'postgres_scrapdatan8n',
    port: 5432,
    database: 'postgres',
    username: 'postgres', 
    password: 'a0bd3b3c1d54b7833014'
}
```

### N8N Webhook Configuration
```javascript
n8n: {
    baseUrl: 'https://projek-n8n-n8n.qk6yxt.easypanel.host',
    webhookUrl: 'https://projek-n8n-n8n.qk6yxt.easypanel.host/webhook/crm',
    workflowId: 'C92dXduOKH38M3pj'
}
```

### WhatsApp API Configuration  
```javascript
whatsapp: {
    baseUrl: 'https://app.notif.my.id/api/v2',
    apiKey: 'mm68fx5IvP2GIb2Wjq1760330685167',
    groupId: '120363421578507033@g.us',
    adminPhone: '085771518231'
}
```

---

## 📊 Dashboard Tabs Overview

### 1️⃣ Overview Tab
- **Real-time Chat Monitor**: Live customer conversations
- **Recent Activities**: System-wide activity feed
- **Classification Charts**: AI performance analytics
- **Interaction Trends**: Historical data visualization

### 2️⃣ Customer Service Tab
- **Customer List**: Searchable customer database
- **Customer Details**: Individual customer profiles
- **Escalations Table**: Priority case management
- **Chat History**: Complete conversation logs

### 3️⃣ Marketing Tab
- **Lead Filters**: Segment-based lead filtering
- **Campaign Statistics**: Performance metrics
- **Lead Database**: Comprehensive lead management
- **Bulk Actions**: Mass contact operations

### 4️⃣ Analytics Tab
- **AI Performance**: Classification accuracy
- **Conversion Funnel**: Marketing effectiveness
- **Response Times**: Service quality metrics
- **Target Tracking**: Goal achievement monitoring

---

## 🔄 Real-time Features

### Auto-Refresh System
- **Chat Monitor**: Updates every 30 seconds
- **Statistics**: Refreshes every 5 minutes  
- **Manual Refresh**: "Refresh Data" button
- **Cache Management**: 30-second cache timeout

### Webhook Integration
- **N8N Triggers**: Send data to workflow
- **Database Updates**: Real-time sync
- **WhatsApp Actions**: Instant messaging
- **Escalation Alerts**: Immediate notifications

---

## 📞 API Endpoints

### Customer Service
```
GET  /customers/list          # Get customer list
GET  /customers/details?id=X   # Get customer details  
GET  /customers/history?id=X   # Get chat history
GET  /escalations/list         # Get escalations
POST /escalations/resolve      # Resolve escalation
```

### Marketing
```  
GET  /leads/list              # Get lead database
POST /leads/contact           # Contact single lead
POST /leads/bulk-contact      # Bulk contact leads
GET  /leads/export            # Export leads CSV
```

### Analytics
```
GET  /analytics/classifications  # Message classifications
GET  /analytics/interactions     # Interaction trends  
GET  /analytics/campaign-stats   # Campaign performance
GET  /stats/quick               # Quick statistics
```

### Integration
```
POST /webhook/trigger         # Trigger N8N webhook
POST /webhook/whatsapp        # Send WhatsApp message
GET  /health                  # System health check
```

---

## 🛠️ Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL connection
psql -h postgres_scrapdatan8n -U postgres -d postgres

# Verify tables exist
\dt
```

### API Integration Problems
1. **Check server-api.php permissions**
2. **Verify PHP PDO PostgreSQL extension**
3. **Check browser network tab for errors**
4. **Review server error logs**

### N8N Webhook Issues
1. **Verify webhook URL accessibility**
2. **Check workflow activation status** 
3. **Review N8N execution logs**
4. **Test webhook with curl**

### WhatsApp API Problems
1. **Verify API key validity**
2. **Check rate limits**
3. **Test with simple message**
4. **Review API documentation**

---

## 📝 Usage Examples

### Sending WhatsApp Message
```javascript
// Via dashboard interface
dashboard.contactCustomer('6281234567890');

// Via API directly
api.sendWhatsAppMessage('6281234567890', 'Hello from CRM!');
```

### Triggering N8N Workflow
```javascript
// Contact lead action
api.triggerN8NWebhook({
    action: 'lead_contacted',
    phone: '6281234567890',
    name: 'Customer Name',
    message: 'Marketing message'
});
```

### Exporting Lead Data
```javascript
// Export filtered leads
api.exportLeadsToCSV({
    segment: 'advertising_signage',
    status: 'new',
    leadScore: 'high'
});
```

---

## 🔒 Security Considerations

### Database Security
- Database credentials in server-side config only
- PHP PDO prepared statements prevent SQL injection
- API input validation and sanitization

### API Security  
- CORS headers properly configured
- Rate limiting implemented
- Error messages don't expose internals
- Timeout protection for all requests

### WhatsApp Security
- API keys stored server-side
- Message content validation
- Phone number format verification

---

## 🚀 Performance Optimization

### Frontend Optimization
- **Lazy Loading**: Tabs loaded on demand
- **Caching**: 30-second API response cache
- **Pagination**: Large datasets chunked
- **Debouncing**: Search/filter delays

### Backend Optimization  
- **Connection Pooling**: PostgreSQL connections
- **Query Optimization**: Indexed database queries
- **Response Compression**: Gzipped API responses
- **Error Recovery**: Graceful fallback data

---

## 📈 Monitoring & Analytics

### System Health
```javascript
// Check system status
api.healthCheck().then(status => {
    console.log('Database:', status.database);
    console.log('Status:', status.status);
});
```

### Performance Metrics
- **API Response Times**: Logged in browser console
- **Database Query Performance**: Server-side logging
- **Cache Hit Rates**: Available via getCacheStats()
- **Error Rates**: Browser and server error logs

---

## 🔮 Future Enhancements

### Planned Features
- [ ] **Mobile App**: React Native companion
- [ ] **Real-time Notifications**: Browser push notifications
- [ ] **Advanced Analytics**: Machine learning insights
- [ ] **Multi-language**: Indonesian and English support
- [ ] **Voice Messages**: WhatsApp voice note support
- [ ] **File Attachments**: Document sharing capability

### Integration Roadmap
- [ ] **CRM Integration**: Salesforce/HubSpot connectors
- [ ] **Accounting**: Invoice generation integration
- [ ] **Inventory**: Stock management connection
- [ ] **Email Marketing**: MailChimp/SendGrid integration

---

## 📞 Support & Contact

### Technical Support
- **Developer**: Heri Asari (setgraph69@gmail.com)
- **Business**: PT Tepat Laser (+62 857-7151-8231)
- **Website**: https://tepatlaser.com

### Emergency Escalation
- **WhatsApp Group**: 120363421578507033@g.us
- **Admin Phone**: +62 857-7151-8231
- **Response Time**: < 2 hours during business hours

---

## 📋 Changelog

### v2.0.0 (Latest) - Production Release
- ✅ **Live PostgreSQL Integration**: Real database connection
- ✅ **N8N Webhook Sync**: Bidirectional workflow integration  
- ✅ **WhatsApp Live API**: Real messaging capability
- ✅ **PHP Server API**: Backend database operations
- ✅ **Error Handling**: Graceful fallbacks and recovery
- ✅ **Caching System**: Performance optimization
- ✅ **Real-time Updates**: 30-second refresh intervals

### v1.0.0 - Initial Release
- 📊 **Dashboard Interface**: Modern responsive design
- 📊 **Mock Data**: Development with sample data
- 📊 **Basic Charts**: Plotly.js integration
- 📊 **Tab Navigation**: Multi-section interface

---

## 📝 License

Dibuat khusus untuk **PT Tepat Laser**. All rights reserved.

**Sistem CRM ini mengintegrasikan workflow N8N dengan interface user-friendly untuk optimalisasi customer service dan marketing automation.**

---

✨ **Dashboard ini siap digunakan untuk produksi dengan integrasi database PostgreSQL real-time, N8N workflows, dan WhatsApp API!** ✨