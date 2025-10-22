// CRM Dashboard Configuration dengan Database Credentials yang Benar
const CONFIG = {
    // Database Configuration - Menggunakan kredential PostgreSQL yang sebenarnya
    database: {
        host: 'postgres_scrapdatan8n',
        port: 5432,
        database: 'postgres', 
        username: 'postgres',
        password: 'a0bd3b3c1d54b7833014',
        ssl: false,
        // Connection string untuk backup
        connectionString: 'postgres://postgres:a0bd3b3c1d54b7833014@postgres_scrapdatan8n:5432/postgres?sslmode=disable'
    },
    // N8N Integration Configuration
    n8n: {
        baseUrl: 'https://projek-n8n-n8n.qk6yxt.easypanel.host',
        webhookUrl: 'https://projek-n8n-n8n.qk6yxt.easypanel.host/webhook/webhook/crm',
        workflowId: 'C92dXduOKH38M3pj', // CS & Marketing Automation v2+
        apiVersion: 'v1'
    },
    // Database Tables Configuration
    tables: {
        customers: 'customers',
        chat_history: 'chat_history', 
        escalations: 'escalations',
        businesses: 'businesses',
        knowledge_ai: 'knowledge_ai',
        campaign_performance: 'campaign_performance',
        customer_engagement_stats: 'customer_engagement_stats'
    },
    // API Configuration
    api: {
        timeout: 30000,
        retries: 3,
        retryDelay: 1000
    },
    // Auto-refresh Configuration
    refresh: {
        enabled: true,
        interval: 300000, // 5 menit
        tables: ['customers', 'chat_history', 'escalations', 'campaign_performance']
    },
    // UI Configuration
    ui: {
        itemsPerPage: 10,
        dateFormat: 'YYYY-MM-DD HH:mm:ss',
        theme: 'light',
        language: 'id',
        charts: {
            defaultType: 'line',
            colors: ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0'],
            animation: true
        }
    },
    // Feature Flags
    features: {
        enableCharts: true,
        enableExport: true,
        enableNotifications: true,
        enableAdvancedFilters: true,
        enableBulkActions: true,
        enableRealTimeUpdates: true
    },
    // Logging Configuration
    logging: {
        level: 'info', // 'debug', 'info', 'warn', 'error'
        enableConsole: true,
        enableRemote: false
    }
};

// Ekspor konfigurasi
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
