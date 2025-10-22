// API Connector untuk CRM Dashboard dengan PHP Server API Integration
class APIConnector {
    constructor() {
        this.config = {
            // Server API Configuration
            serverApi: {
                baseUrl: './server-api.php', // Adjust path as needed
                timeout: 30000
            },
            
            // N8N Integration
            n8n: {
                baseUrl: 'https://projek-n8n-n8n.qk6yxt.easypanel.host',
                webhookUrl: 'https://projek-n8n-n8n.qk6yxt.easypanel.host/webhook/crm'
            },
            
            // WhatsApp API
            whatsapp: {
                baseUrl: 'https://app.notif.my.id/api/v2',
                apiKey: 'mm68fx5IvP2GIb2Wjq1760330685167'
            }
        };
        
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
    }

    // Generic fetch with error handling and retry logic
    async fetchWithRetry(url, options = {}, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.serverApi.timeout);
                
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });
                
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.warn(`Attempt ${i + 1} failed:`, error.message);
                
                if (i === retries - 1) {
                    // Last attempt failed, return fallback data if available
                    return this.getFallbackData(url, options);
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    // Cache management
    getCached(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    // Server API call wrapper
    async callServerApi(endpoint, options = {}) {
        const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
        const cached = this.getCached(cacheKey);
        if (cached && !options.bypassCache) {
            return cached;
        }

        try {
            const url = `${this.config.serverApi.baseUrl}/${endpoint.replace(/^\//, '')}`;
            const response = await this.fetchWithRetry(url, {
                method: options.method || 'GET',
                body: options.data ? JSON.stringify(options.data) : undefined,
                ...options
            });

            if (response && response.data !== undefined) {
                this.setCache(cacheKey, response);
                return response;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error(`Server API call failed for ${endpoint}:`, error);
            throw error;
        }
    }

    // Fallback data for when API fails
    getFallbackData(url, options) {
        console.warn('Using fallback data due to API failure');
        
        if (url.includes('customers')) {
            return {
                data: [
                    {
                        id: 1,
                        phone: '6281234567890',
                        name: 'Bapak Andi',
                        location: 'Jakarta Selatan',
                        conversation_stage: 'waiting_size',
                        last_interaction: new Date().toISOString(),
                        is_cooldown_active: false,
                        message_count: 3,
                        created_at: new Date(Date.now() - 86400000).toISOString()
                    },
                    {
                        id: 2,
                        phone: '6289876543210',
                        name: 'Ibu Siti',
                        location: 'Tangerang',
                        conversation_stage: 'greeting',
                        last_interaction: new Date(Date.now() - 3600000).toISOString(),
                        is_cooldown_active: true,
                        message_count: 1,
                        created_at: new Date(Date.now() - 172800000).toISOString()
                    }
                ],
                count: 2
            };
        }
        
        if (url.includes('leads') || url.includes('businesses')) {
            return {
                data: [
                    {
                        id: 1,
                        name: 'CV. Surya Laser',
                        phone: '6281234567890',
                        address: 'Jl. Sudirman No. 123, Jakarta',
                        market_segment: 'advertising_signage',
                        lead_score: 85,
                        status: 'new',
                        rating: 4.5,
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 2,
                        name: 'Bengkel Las Sejahtera',
                        phone: '6289876543210',
                        address: 'Jl. Ahmad Yani No. 45, Tangerang',
                        market_segment: 'metal_fabrication',
                        lead_score: 72,
                        status: 'contacted',
                        rating: 4.2,
                        created_at: new Date(Date.now() - 86400000).toISOString()
                    }
                ],
                count: 2
            };
        }
        
        if (url.includes('escalations')) {
            return {
                data: [
                    {
                        id: 1,
                        customer_id: 1,
                        escalation_type: 'ESCALATE_PRICE',
                        priority: 'high',
                        status: 'open',
                        reason: 'Customer minta penawaran harga segera',
                        created_at: new Date().toISOString(),
                        customer_name: 'Bapak Budi',
                        customer_phone: '6281122334455'
                    }
                ]
            };
        }
        
        if (url.includes('stats')) {
            return {
                data: {
                    totalCustomers: 1247,
                    totalLeads: 892,
                    totalEscalations: 23,
                    responseRate: 78
                }
            };
        }
        
        return { data: [], error: 'No fallback data available' };
    }

    // Customer Service API Methods
    async getCustomers(filters = {}) {
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);
        if (filters.status) params.append('status', filters.status);
        
        const endpoint = `customers/list?${params.toString()}`;
        const response = await this.callServerApi(endpoint);
        return response.data || [];
    }

    async getCustomerDetails(customerId) {
        const endpoint = `customers/details?id=${customerId}`;
        const response = await this.callServerApi(endpoint);
        return response.data || null;
    }

    async getChatHistory(customerId, limit = 50) {
        const endpoint = `customers/history?id=${customerId}&limit=${limit}`;
        const response = await this.callServerApi(endpoint);
        return response.data || [];
    }

    async getEscalations(filters = {}) {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.priority) params.append('priority', filters.priority);
        
        const endpoint = `escalations/list?${params.toString()}`;
        const response = await this.callServerApi(endpoint);
        return response.data || [];
    }

    // Marketing API Methods
    async getBusinessLeads(filters = {}) {
        const params = new URLSearchParams();
        if (filters.segment) params.append('segment', filters.segment);
        if (filters.status) params.append('status', filters.status);
        if (filters.leadScore) params.append('lead_score', filters.leadScore);
        
        const endpoint = `leads/list?${params.toString()}`;
        const response = await this.callServerApi(endpoint);
        return response.data || [];
    }

    async getCampaignStats(dateFilter = 'today') {
        const endpoint = `analytics/campaign-stats?date_filter=${dateFilter}`;
        const response = await this.callServerApi(endpoint);
        return response.data || {
            totalSent: 156,
            totalDelivered: 142,
            totalFailed: 14,
            responseCount: 23
        };
    }

    // Analytics API Methods
    async getMessageClassifications(dateFilter = 'week') {
        try {
            const endpoint = `analytics/classifications?date_filter=${dateFilter}`;
            const response = await this.callServerApi(endpoint);
            return response.data || {
                'AI_AGENT': 45,
                'ESCALATE_PRICE': 25,
                'ESCALATE_URGENT': 15,
                'BUYING_READY': 15
            };
        } catch (error) {
            console.warn('Failed to fetch classifications, using fallback');
            return {
                'AI_AGENT': 45,
                'ESCALATE_PRICE': 25,
                'ESCALATE_URGENT': 15,
                'BUYING_READY': 15
            };
        }
    }

    async getInteractionTrends(days = 7) {
        try {
            const endpoint = `analytics/interactions?days=${days}`;
            const response = await this.callServerApi(endpoint);
            return response.data || [
                { date: '2024-01-01', count: 120 },
                { date: '2024-01-02', count: 135 },
                { date: '2024-01-03', count: 148 },
                { date: '2024-01-04', count: 162 },
                { date: '2024-01-05', count: 178 }
            ];
        } catch (error) {
            console.warn('Failed to fetch interaction trends, using fallback');
            return [
                { date: '2024-01-01', count: 120 },
                { date: '2024-01-02', count: 135 },
                { date: '2024-01-03', count: 148 },
                { date: '2024-01-04', count: 162 },
                { date: '2024-01-05', count: 178 }
            ];
        }
    }

    // Real-time data methods
    async getRecentChats(limit = 10) {
        try {
            const endpoint = `chat/recent?limit=${limit}`;
            const response = await this.callServerApi(endpoint);
            return response.data || [];
        } catch (error) {
            console.warn('Failed to fetch recent chats, using fallback');
            return [
                {
                    id: 1,
                    customer_id: 1,
                    message_type: 'in',
                    content: 'Halo, saya ingin pesan laser cutting untuk pagar rumah',
                    classification: 'BUYING_READY',
                    ai_confidence: 0.95,
                    created_at: new Date().toISOString(),
                    customer_name: 'Bapak Andi',
                    customer_phone: '6281234567890'
                },
                {
                    id: 2,
                    customer_id: 1,
                    message_type: 'out',
                    content: 'Baik Pak Andi, untuk pesanan laser cutting pagar rumah, bisa tolong informasikan ukuran dan material yang diinginkan?',
                    classification: 'AI_AGENT',
                    ai_confidence: 0.92,
                    created_at: new Date(Date.now() - 300000).toISOString(),
                    customer_name: 'AI Agent',
                    customer_phone: '6281234567890'
                }
            ];
        }
    }

    async getRecentActivities(limit = 20) {
        try {
            const endpoint = `stats/activities?limit=${limit}`;
            const response = await this.callServerApi(endpoint);
            return response.data || [];
        } catch (error) {
            console.warn('Failed to fetch recent activities, using fallback');
            return [
                {
                    type: 'escalation',
                    description: 'Escalation baru: Customer minta harga urgent',
                    timestamp: new Date().toISOString(),
                    customer: 'Bapak Budi'
                },
                {
                    type: 'lead_contact',
                    description: 'Berhasil kontak 15 leads baru',
                    timestamp: new Date(Date.now() - 900000).toISOString(),
                    customer: null
                }
            ];
        }
    }

    // Quick Stats
    async getQuickStats() {
        try {
            const endpoint = 'stats/quick';
            const response = await this.callServerApi(endpoint);
            return response.data || {
                totalCustomers: 1247,
                totalLeads: 892,
                totalEscalations: 23,
                responseRate: 78
            };
        } catch (error) {
            console.warn('Failed to fetch quick stats, using fallback');
            return {
                totalCustomers: 1247,
                totalLeads: 892,
                totalEscalations: 23,
                responseRate: 78
            };
        }
    }

    // WhatsApp Integration Methods
    async sendWhatsAppMessage(phone, message, type = 'text') {
        try {
            const endpoint = 'webhook/whatsapp';
            const response = await this.callServerApi(endpoint, {
                method: 'POST',
                data: {
                    phone: phone,
                    message: message,
                    type: type
                }
            });
            return response;
        } catch (error) {
            console.error('WhatsApp send error:', error);
            throw error;
        }
    }

    // N8N Webhook Integration
    async triggerN8NWebhook(data, webhookType = 'crm') {
        try {
            const endpoint = 'webhook/trigger';
            const response = await this.callServerApi(endpoint, {
                method: 'POST',
                data: {
                    ...data,
                    webhook_type: webhookType
                }
            });
            return response;
        } catch (error) {
            console.error('N8N webhook error:', error);
            throw error;
        }
    }

    // Bulk operations
    async bulkUpdateLeadStatus(leadIds, newStatus) {
        try {
            const endpoint = 'leads/bulk-update';
            const response = await this.callServerApi(endpoint, {
                method: 'POST',
                data: {
                    lead_ids: leadIds,
                    status: newStatus
                }
            });
            return response.data || [];
        } catch (error) {
            console.error('Bulk update error:', error);
            throw error;
        }
    }

    async exportLeadsToCSV(filters = {}) {
        try {
            const leads = await this.getBusinessLeads(filters);
            
            const csvHeaders = [
                'ID', 'Nama Bisnis', 'Telepon', 'Alamat', 'Website', 
                'Rating', 'Market Segment', 'Lead Score', 'Status', 
                'Kontak Terakhir', 'Tanggal Dibuat'
            ];

            const csvRows = leads.map(lead => [
                lead.id,
                `"${lead.name}"`,
                lead.phone,
                `"${lead.address || ''}"`,
                lead.website || '',
                lead.rating || 0,
                lead.market_segment,
                lead.lead_score,
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
        } catch (error) {
            console.error('Error exporting leads:', error);
            throw error;
        }
    }

    // Health check
    async healthCheck() {
        try {
            const endpoint = 'health';
            const response = await this.callServerApi(endpoint, { bypassCache: true });
            return {
                database: response.database || false,
                status: response.status || 'unknown',
                timestamp: response.timestamp || new Date().toISOString()
            };
        } catch (error) {
            console.warn('Health check failed:', error);
            return {
                database: false,
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Utility methods
    clearCache() {
        this.cache.clear();
        console.log('API cache cleared');
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }

    // Configuration methods
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('API configuration updated');
    }

    getConfig() {
        return { ...this.config };
    }
}

// Make APIConnector available globally
if (typeof window !== 'undefined') {
    window.APIConnector = APIConnector;
    window.apiConnector = new APIConnector();
    
    // Log initialization
    console.log('🔗 CRM API Connector initialized:', {
        serverApi: window.apiConnector.config.serverApi.baseUrl,
        n8nWebhook: window.apiConnector.config.n8n.webhookUrl,
        cacheTimeout: window.apiConnector.cacheTimeout
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIConnector;
}