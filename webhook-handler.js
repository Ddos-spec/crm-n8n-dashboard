// Webhook Handler untuk CRM Dashboard - N8N Integration
class WebhookHandler {
    constructor() {
        this.config = {
            n8nWebhookUrl: 'https://n8n-cors-proxy.setgraph69.workers.dev/webhook/crm',
            responseWebhookUrl: 'https://n8n-cors-proxy.setgraph69.workers.dev/webhook/crm-response',
            workflowId: 'C92dXduOKH38M3pj',
            retryAttempts: 3,
            timeout: 30000
        };
        
        this.responseHandlers = new Map();
        this.init();
    }

    init() {
        console.log('🔗 Initializing N8N Webhook Handler');
        this.setupResponseListener();
    }

    // Setup listener untuk response dari N8N
    setupResponseListener() {
        // Simulate webhook listener (dalam implementasi nyata, ini akan jadi endpoint)
        window.addEventListener('n8n-response', (event) => {
            this.handleN8NResponse(event.detail);
        });
    }

    // Kirim data ke N8N workflow
    async sendToN8N(action, data = {}) {
        const requestId = this.generateRequestId();
        
        const payload = {
            request_id: requestId,
            source: 'crm_dashboard',
            action: action,
            timestamp: new Date().toISOString(),
            data: data
        };

        console.log(`📤 Sending to N8N [${action}]:`, payload);

        try {
            const response = await this.makeWebhookRequest(this.config.n8nWebhookUrl, payload);
            
            // Store response handler untuk request ini
            return new Promise((resolve, reject) => {
                this.responseHandlers.set(requestId, { resolve, reject, action });
                
                // Timeout handler
                setTimeout(() => {
                    if (this.responseHandlers.has(requestId)) {
                        this.responseHandlers.delete(requestId);
                        reject(new Error(`Timeout waiting for N8N response: ${action}`));
                    }
                }, this.config.timeout);
            });
        } catch (error) {
            console.error(`❌ Failed to send to N8N [${action}]:`, error);
            throw error;
        }
    }

    // Handle response dari N8N
    handleN8NResponse(response) {
        const { request_id, action, success, data, error } = response;
        
        console.log(`📥 Received N8N response [${action}]:`, response);
        
        const handler = this.responseHandlers.get(request_id);
        if (handler) {
            this.responseHandlers.delete(request_id);
            
            if (success) {
                handler.resolve(data);
            } else {
                handler.reject(new Error(error || 'N8N workflow error'));
            }
        }
    }

    // Database query via N8N
    async queryDatabase(query, params = []) {
        return await this.sendToN8N('database_query', {
            query: query,
            params: params
        });
    }

    // Get customers dari database via N8N
    async getCustomers(filters = {}) {
        return await this.sendToN8N('get_customers', {
            filters: filters
        });
    }

    // Get leads dari database via N8N
    async getLeads(filters = {}) {
        return await this.sendToN8N('get_leads', {
            filters: filters
        });
    }

    // Get escalations dari database via N8N
    async getEscalations(filters = {}) {
        return await this.sendToN8N('get_escalations', {
            filters: filters
        });
    }

    // Get quick stats dari database via N8N
    async getQuickStats() {
        return await this.sendToN8N('get_quick_stats', {});
    }

    // Get recent chats via N8N
    async getRecentChats(limit = 10) {
        return await this.sendToN8N('get_recent_chats', {
            limit: limit
        });
    }

    // Get recent activities via N8N
    async getRecentActivities(limit = 20) {
        return await this.sendToN8N('get_recent_activities', {
            limit: limit
        });
    }

    // Send WhatsApp message via N8N
    async sendWhatsAppMessage(phone, message, type = 'text') {
        return await this.sendToN8N('send_whatsapp_message', {
            phone: phone,
            message: message,
            type: type
        });
    }

    // Bulk contact leads via N8N
    async bulkContactLeads(leadIds, message) {
        return await this.sendToN8N('bulk_contact_leads', {
            lead_ids: leadIds,
            message: message
        });
    }

    // Resolve escalation via N8N
    async resolveEscalation(escalationId) {
        return await this.sendToN8N('resolve_escalation', {
            escalation_id: escalationId
        });
    }

    // Get analytics data via N8N
    async getAnalytics(type = 'all') {
        return await this.sendToN8N('get_analytics', {
            type: type
        });
    }

    // Update customer status via N8N
    async updateCustomerStatus(customerId, status) {
        return await this.sendToN8N('update_customer_status', {
            customer_id: customerId,
            status: status
        });
    }

    // Contact single lead via N8N
    async contactLead(phone, name, message) {
        return await this.sendToN8N('contact_lead', {
            phone: phone,
            name: name,
            message: message
        });
    }

    // Health check via N8N
    async healthCheck() {
        try {
            const response = await this.sendToN8N('health_check', {});
            return {
                status: 'healthy',
                database: true,
                n8n: true,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy', 
                database: false,
                n8n: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Utility methods
    async makeWebhookRequest(url, data) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'CRM-Dashboard/2.0'
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
            }

            // N8N biasanya return text "OK" atau JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                const text = await response.text();
                return { success: true, message: text };
            }
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Webhook request timeout');
            }
            throw error;
        }
    }

    generateRequestId() {
        return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Simulate N8N response (untuk testing)
    simulateN8NResponse(requestId, action, data) {
        setTimeout(() => {
            const event = new CustomEvent('n8n-response', {
                detail: {
                    request_id: requestId,
                    action: action,
                    success: true,
                    data: data
                }
            });
            window.dispatchEvent(event);
        }, 1000 + Math.random() * 2000); // 1-3 second delay
    }
}

// Alternative API Connector yang menggunakan webhook
class WebhookAPIConnector {
    constructor() {
        this.webhookHandler = new WebhookHandler();
        this.fallbackData = new FallbackDataProvider();
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
    }

    // Cache management
    getCached(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    setCached(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    async callWithFallback(method, ...args) {
        const cacheKey = `${method}:${JSON.stringify(args)}`;
        const cached = this.getCached(cacheKey);
        
        if (cached) {
            console.log(`📋 Using cached data for ${method}`);
            return cached;
        }

        try {
            console.log(`🔄 Calling N8N webhook for ${method}`);
            const result = await this.webhookHandler[method](...args);
            
            if (result && typeof result === 'object') {
                this.setCached(cacheKey, result);
                return result;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.warn(`⚠️ N8N webhook failed for ${method}, using fallback:`, error.message);
            const fallbackResult = this.fallbackData.getFallbackData(method, args);
            return fallbackResult;
        }
    }

    // Public API methods
    async getCustomers(filters = {}) {
        return await this.callWithFallback('getCustomers', filters);
    }

    async getBusinessLeads(filters = {}) {
        return await this.callWithFallback('getLeads', filters);
    }

    async getEscalations(filters = {}) {
        return await this.callWithFallback('getEscalations', filters);
    }

    async getQuickStats() {
        return await this.callWithFallback('getQuickStats');
    }

    async getRecentChats(limit = 10) {
        return await this.callWithFallback('getRecentChats', limit);
    }

    async getRecentActivities(limit = 20) {
        return await this.callWithFallback('getRecentActivities', limit);
    }

    async sendWhatsAppMessage(phone, message, type = 'text') {
        return await this.webhookHandler.sendWhatsAppMessage(phone, message, type);
    }

    async contactLead(phone, name, message) {
        return await this.webhookHandler.contactLead(phone, name, message);
    }

    async bulkContactLeads(leadIds, message) {
        return await this.webhookHandler.bulkContactLeads(leadIds, message);
    }

    async resolveEscalation(escalationId) {
        return await this.webhookHandler.resolveEscalation(escalationId);
    }

    async healthCheck() {
        return await this.callWithFallback('healthCheck');
    }

    // Analytics methods
    async getMessageClassifications(dateFilter = 'week') {
        const analytics = await this.callWithFallback('getAnalytics', 'classifications');
        return analytics.classifications || this.fallbackData.getClassifications();
    }

    async getInteractionTrends(days = 7) {
        const analytics = await this.callWithFallback('getAnalytics', 'interactions');
        return analytics.interactions || this.fallbackData.getInteractions();
    }

    async getCampaignStats(dateFilter = 'today') {
        const analytics = await this.callWithFallback('getAnalytics', 'campaign');
        return analytics.campaign || this.fallbackData.getCampaignStats();
    }

    // Export methods
    async exportLeadsToCSV(filters = {}) {
        const leads = await this.getBusinessLeads(filters);
        return this.generateCSV(leads);
    }

    generateCSV(leads) {
        const csvHeaders = [
            'ID', 'Nama Bisnis', 'Telepon', 'Alamat', 'Website', 
            'Rating', 'Market Segment', 'Lead Score', 'Status', 
            'Kontak Terakhir', 'Tanggal Dibuat'
        ];

        const csvRows = leads.map(lead => [
            lead.id,
            `"${lead.name || lead.business_name}"`,
            lead.phone || lead.formatted_phone_number,
            `"${lead.address || ''}"`,
            lead.website || '',
            lead.rating || 0,
            lead.market_segment || lead.segment,
            lead.lead_score || lead.score,
            lead.status,
            lead.last_contacted || '',
            new Date(lead.created_at).toLocaleDateString('id-ID')
        ]);

        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.join(','))
            .join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return csvContent;
    }

    // Utility methods
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache cleared');
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Fallback data provider
class FallbackDataProvider {
    getFallbackData(method, args) {
        console.log(`📋 Providing fallback data for ${method}`);
        
        switch (method) {
            case 'getQuickStats':
                return {
                    totalCustomers: 125,
                    totalLeads: 89,
                    totalEscalations: 3,
                    responseRate: 87
                };
                
            case 'getCustomers':
                return this.getSampleCustomers();
                
            case 'getLeads':
                return this.getSampleLeads();
                
            case 'getEscalations':
                return this.getSampleEscalations();
                
            case 'getRecentChats':
                return this.getSampleChats();
                
            case 'getRecentActivities':
                return this.getSampleActivities();
                
            default:
                return [];
        }
    }

    getSampleCustomers() {
        return [
            {
                id: 1,
                name: 'Bapak Andi Suharto',
                phone: '6281234567890',
                location: 'Jakarta Selatan',
                conversation_stage: 'quotation_sent',
                last_interaction: new Date(Date.now() - 1800000).toISOString(),
                is_cooldown_active: false,
                message_count: 5,
                created_at: new Date(Date.now() - 86400000).toISOString()
            },
            {
                id: 2,
                name: 'Ibu Sari Melati',
                phone: '6289876543210',
                location: 'Tangerang',
                conversation_stage: 'interested',
                last_interaction: new Date(Date.now() - 3600000).toISOString(),
                is_cooldown_active: true,
                message_count: 3,
                created_at: new Date(Date.now() - 172800000).toISOString()
            }
        ];
    }

    getSampleLeads() {
        return [
            {
                id: 1,
                name: 'PT Surya Advertising',
                phone: '6281234567890',
                address: 'Jl. Sudirman No. 123, Jakarta Pusat',
                market_segment: 'advertising_signage',
                lead_score: 85,
                status: 'new',
                rating: 4.5,
                created_at: new Date().toISOString()
            },
            {
                id: 2,
                name: 'CV Maju Jaya Furniture',
                phone: '6289876543210',
                address: 'Jl. Raya Serpong No. 45, Tangerang',
                market_segment: 'furniture_manufacturing',
                lead_score: 72,
                status: 'contacted',
                rating: 4.2,
                created_at: new Date(Date.now() - 86400000).toISOString()
            }
        ];
    }

    getSampleEscalations() {
        return [
            {
                id: 1,
                customer_name: 'Bapak Budi Santoso',
                customer_phone: '6281122334455',
                escalation_type: 'ESCALATE_PRICE',
                priority: 'high',
                status: 'open',
                reason: 'Customer butuh quotation urgent untuk project besar',
                created_at: new Date(Date.now() - 1800000).toISOString()
            }
        ];
    }

    getSampleChats() {
        return [
            {
                id: 1,
                customer_name: 'Bapak Andi',
                customer_phone: '6281234567890',
                message_type: 'in',
                content: 'Selamat siang, saya ingin tanya harga laser cutting untuk plat stainless steel tebal 3mm',
                classification: 'ESCALATE_PRICE',
                created_at: new Date().toISOString()
            },
            {
                id: 2,
                customer_name: 'AI Agent',
                customer_phone: '6281234567890', 
                message_type: 'out',
                content: 'Selamat siang Pak Andi! Untuk mendapatkan quotation yang akurat, boleh saya tahu ukuran dan bentuk yang diinginkan?',
                classification: 'AI_AGENT',
                created_at: new Date(Date.now() - 300000).toISOString()
            }
        ];
    }

    getSampleActivities() {
        return [
            {
                type: 'escalation',
                description: 'Escalation baru: Customer butuh quotation urgent',
                timestamp: new Date().toISOString(),
                customer: 'Bapak Budi'
            },
            {
                type: 'lead_contact',
                description: 'Lead baru dikontak: PT Surya Advertising',
                timestamp: new Date(Date.now() - 900000).toISOString(),
                customer: 'PT Surya Advertising'
            }
        ];
    }

    getClassifications() {
        return {
            'AI_AGENT': 45,
            'ESCALATE_PRICE': 25,
            'ESCALATE_URGENT': 15,
            'BUYING_READY': 15
        };
    }

    getInteractions() {
        const today = new Date();
        const interactions = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            interactions.push({
                date: date.toISOString().split('T')[0],
                count: Math.floor(Math.random() * 50) + 100
            });
        }
        
        return interactions;
    }

    getCampaignStats() {
        return {
            totalSent: 156,
            totalDelivered: 142,
            totalFailed: 14,
            responseCount: 23
        };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.WebhookHandler = WebhookHandler;
    window.WebhookAPIConnector = WebhookAPIConnector;
    window.webhookApiConnector = new WebhookAPIConnector();
    
    console.log('🔗 Webhook API Connector initialized');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WebhookHandler, WebhookAPIConnector, FallbackDataProvider };
}
