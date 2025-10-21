// API Connector for CRM Dashboard
// Handles database operations and external API calls

class APIConnector {
    constructor(config) {
        this.config = config;
        this.baseUrl = config.api.baseUrl;
        this.timeout = config.api.timeout;
    }

    // Database connection methods
    async connectToDatabase() {
        try {
            // In a real implementation, this would connect to PostgreSQL
            // For now, we'll simulate the connection
            console.log('Connecting to PostgreSQL database...');
            console.log('Host:', this.config.database.host);
            console.log('Database:', this.config.database.database);
            
            // Simulate connection delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log('Database connection established');
            return true;
        } catch (error) {
            console.error('Database connection failed:', error);
            throw error;
        }
    }

    // Customer Service API Methods
    async fetchCustomers(params = {}) {
        try {
            // Simulate API call to fetch customers
            console.log('Fetching customers with params:', params);
            
            // Mock data - replace with real API call
            const mockCustomers = [
                {
                    id: 1,
                    name: 'Bapak Andi',
                    phone: '6281234567890',
                    location: 'Jakarta Selatan',
                    material: 'Besi',
                    conversation_stage: 'waiting_size',
                    last_interaction: new Date().toISOString(),
                    status: 'active',
                    is_cooldown_active: false,
                    message_count_today: 3,
                    created_at: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    id: 2,
                    name: 'Ibu Siti',
                    phone: '6289876543210',
                    location: 'Tangerang',
                    material: 'Akrilik',
                    conversation_stage: 'greeting',
                    last_interaction: new Date(Date.now() - 3600000).toISOString(),
                    status: 'cooldown',
                    is_cooldown_active: true,
                    message_count_today: 1,
                    created_at: new Date(Date.now() - 172800000).toISOString()
                },
                {
                    id: 3,
                    name: 'Bapak Budi',
                    phone: '6281122334455',
                    location: 'Bekasi',
                    material: 'Stainless Steel',
                    conversation_stage: 'escalated',
                    last_interaction: new Date(Date.now() - 7200000).toISOString(),
                    status: 'escalated',
                    is_cooldown_active: false,
                    message_count_today: 5,
                    created_at: new Date(Date.now() - 259200000).toISOString()
                }
            ];

            // Apply filters if provided
            let filteredCustomers = mockCustomers;
            
            if (params.search) {
                filteredCustomers = filteredCustomers.filter(customer =>
                    customer.name.toLowerCase().includes(params.search.toLowerCase()) ||
                    customer.phone.includes(params.search)
                );
            }
            
            if (params.status) {
                filteredCustomers = filteredCustomers.filter(customer =>
                    customer.status === params.status
                );
            }

            return {
                success: true,
                data: filteredCustomers,
                total: filteredCustomers.length
            };
        } catch (error) {
            console.error('Error fetching customers:', error);
            throw error;
        }
    }

    async fetchCustomerChats(customerId, limit = 20) {
        try {
            console.log('Fetching chats for customer:', customerId);
            
            // Mock chat data
            const mockChats = [
                {
                    id: 1,
                    customer_id: customerId,
                    message_type: 'in',
                    content: 'Halo, saya ingin pesan laser cutting untuk pagar rumah',
                    classification: 'BUYING_READY',
                    ai_confidence: 0.95,
                    created_at: new Date().toISOString()
                },
                {
                    id: 2,
                    customer_id: customerId,
                    message_type: 'out',
                    content: 'Baik Pak, untuk pesanan laser cutting pagar rumah, bisa tolong informasikan ukuran dan material yang diinginkan?',
                    classification: 'AI_AGENT',
                    ai_confidence: 0.92,
                    created_at: new Date(Date.now() - 300000).toISOString()
                }
            ];

            return {
                success: true,
                data: mockChats
            };
        } catch (error) {
            console.error('Error fetching customer chats:', error);
            throw error;
        }
    }

    async fetchEscalations(params = {}) {
        try {
            console.log('Fetching escalations with params:', params);
            
            // Mock escalation data
            const mockEscalations = [
                {
                    id: 1,
                    customer_id: 3,
                    customer_name: 'Bapak Budi',
                    escalation_type: 'ESCALATE_PRICE',
                    escalation_reason: 'Customer minta penawaran harga segera',
                    priority_level: 'high',
                    status: 'open',
                    chat_summary: 'Customer: Berapa harga laser cutting? | AI: Bisa tolong info ukuran dan material? | Customer: Saya butuk harga segera untuk project urgent',
                    created_at: new Date().toISOString(),
                    assigned_to: null
                },
                {
                    id: 2,
                    customer_id: 2,
                    customer_name: 'Ibu Ratna',
                    escalation_type: 'ESCALATE_URGENT',
                    escalation_reason: 'Komplain keterlambatan pengiriman',
                    priority_level: 'urgent',
                    status: 'in_progress',
                    chat_summary: 'Customer: Saya komplain order saya terlambat | AI: Mohon maaf, kami akan cek status pengiriman',
                    created_at: new Date(Date.now() - 3600000).toISOString(),
                    assigned_to: 'Sales Team'
                }
            ];

            return {
                success: true,
                data: mockEscalations
            };
        } catch (error) {
            console.error('Error fetching escalations:', error);
            throw error;
        }
    }

    // Marketing API Methods
    async fetchLeads(params = {}) {
        try {
            console.log('Fetching leads with params:', params);
            
            // Mock lead data
            const mockLeads = [
                {
                    id: 1,
                    name: 'CV. Surya Laser',
                    phone: '6281234567890',
                    formatted_phone_number: '(021) 12345678',
                    address: 'Jl. Sudirman No. 123, Jakarta',
                    market_segment: 'advertising_signage',
                    lead_score: 85,
                    rating: 4.5,
                    status: 'new',
                    contact_attempts: 0,
                    message_sent: false,
                    created_at: new Date().toISOString()
                },
                {
                    id: 2,
                    name: 'Bengkel Las Sejahtera',
                    phone: '6289876543210',
                    formatted_phone_number: '(021) 87654321',
                    address: 'Jl. Ahmad Yani No. 45, Tangerang',
                    market_segment: 'metal_fabrication',
                    lead_score: 72,
                    rating: 4.2,
                    status: 'contacted',
                    contact_attempts: 1,
                    message_sent: true,
                    created_at: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    id: 3,
                    name: 'Furniture Indah',
                    phone: '6281122334455',
                    formatted_phone_number: '(021) 11223344',
                    address: 'Jl. Gatot Subroto No. 78, Bekasi',
                    market_segment: 'furniture_manufacturing',
                    lead_score: 68,
                    rating: 4.0,
                    status: 'new',
                    contact_attempts: 0,
                    message_sent: false,
                    created_at: new Date(Date.now() - 172800000).toISOString()
                }
            ];

            // Apply filters
            let filteredLeads = mockLeads;
            
            if (params.segment) {
                filteredLeads = filteredLeads.filter(lead =>
                    lead.market_segment === params.segment
                );
            }
            
            if (params.status) {
                filteredLeads = filteredLeads.filter(lead =>
                    lead.status === params.status
                );
            }

            return {
                success: true,
                data: filteredLeads,
                total: filteredLeads.length
            };
        } catch (error) {
            console.error('Error fetching leads:', error);
            throw error;
        }
    }

    async fetchCampaignStats() {
        try {
            console.log('Fetching campaign statistics');
            
            // Mock campaign stats
            const stats = {
                total_sent: 156,
                total_delivered: 142,
                total_failed: 14,
                success_rate: 91.0,
                response_count: 23,
                conversion_count: 8,
                campaign_batch: 'laser_campaign_2024-01-15',
                last_updated: new Date().toISOString()
            };

            return {
                success: true,
                data: stats
            };
        } catch (error) {
            console.error('Error fetching campaign stats:', error);
            throw error;
        }
    }

    // WhatsApp API Methods
    async sendWhatsAppMessage(phone, message, apiKey = null) {
        try {
            const apiKeyToUse = apiKey || this.config.whatsapp.apiKey;
            
            console.log('Sending WhatsApp message to:', phone);
            console.log('Message:', message);
            
            // Simulate WhatsApp API call
            const response = await this.simulateApiCall({
                url: `${this.config.whatsapp.baseUrl}/send-message`,
                method: 'POST',
                data: {
                    apikey: apiKeyToUse,
                    mtype: 'text',
                    receiver: phone,
                    text: message
                }
            });

            return {
                success: true,
                message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                status: 'sent',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error sending WhatsApp message:', error);
            throw error;
        }
    }

    async sendGroupMessage(message) {
        try {
            console.log('Sending group message:', message);
            
            const response = await this.simulateApiCall({
                url: `${this.config.whatsapp.baseUrl}/send-message`,
                method: 'POST',
                data: {
                    apikey: this.config.whatsapp.groupApiKey,
                    mtype: 'text',
                    receiver: this.config.whatsapp.groupId,
                    text: message
                }
            });

            return {
                success: true,
                message_id: `group_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                status: 'sent',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error sending group message:', error);
            throw error;
        }
    }

    // Analytics Methods
    async fetchAnalyticsData() {
        try {
            console.log('Fetching analytics data');
            
            // Mock analytics data
            const analytics = {
                classifications: {
                    'AI_AGENT': 45,
                    'ESCALATE_PRICE': 25,
                    'ESCALATE_URGENT': 15,
                    'BUYING_READY': 15
                },
                interactions: [
                    { date: '2024-01-01', count: 120 },
                    { date: '2024-01-02', count: 135 },
                    { date: '2024-01-03', count: 148 },
                    { date: '2024-01-04', count: 162 },
                    { date: '2024-01-05', count: 178 }
                ],
                response_times: {
                    average: 2.3,
                    fastest: 0.5,
                    slowest: 8.7
                },
                targets: {
                    daily: 100,
                    contacted: 78,
                    percentage: 78
                },
                ai_performance: {
                    accuracy: 89.5,
                    precision: 87.2,
                    recall: 91.8,
                    f1_score: 89.4
                }
            };

            return {
                success: true,
                data: analytics
            };
        } catch (error) {
            console.error('Error fetching analytics data:', error);
            throw error;
        }
    }

    // Utility Methods
    async simulateApiCall(options) {
        // Simulate network delay
        const delay = Math.random() * 1000 + 500; // 500-1500ms
        await new Promise(resolve => setTimeout(resolve, delay));

        // Simulate occasional errors (5% chance)
        if (Math.random() < 0.05) {
            throw new Error('Simulated API error');
        }

        // Return mock success response
        return {
            success: true,
            status: 200,
            data: options.data || {}
        };
    }

    // Export methods
    async exportLeadsToCSV(leads) {
        try {
            console.log('Exporting leads to CSV:', leads.length);
            
            // Create CSV content
            const headers = ['ID', 'Name', 'Phone', 'Address', 'Segment', 'Score', 'Status', 'Created At'];
            const csvContent = [
                headers.join(','),
                ...leads.map(lead => [
                    lead.id,
                    `"${lead.name}"`,
                    lead.phone,
                    `"${lead.address}"`,
                    lead.market_segment,
                    lead.lead_score,
                    lead.status,
                    lead.created_at
                ].join(','))
            ].join('\n');

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

            return {
                success: true,
                message: 'CSV exported successfully'
            };
        } catch (error) {
            console.error('Error exporting leads to CSV:', error);
            throw error;
        }
    }

    // Error handling
    handleError(error, context) {
        console.error(`Error in ${context}:`, error);
        
        // Log to error tracking service in production
        if (window.CONFIG && window.CONFIG.environment === 'production') {
            // Send to error tracking service
            console.log('Error logged to tracking service');
        }
    }
}

// Create global instance
window.apiConnector = new APIConnector(window.CONFIG || {});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIConnector;
}