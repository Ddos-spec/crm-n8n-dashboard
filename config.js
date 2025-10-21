// CRM Dashboard Configuration
const CONFIG = {
    // Database Configuration
    database: {
        host: 'postgres_scrapdatan8n',
        port: 5432,
        database: 'postgres',
        username: 'postgres',
        password: 'a0bd3b3c1d54b7833014',
        ssl: false
    },

    // API Configuration
    api: {
        baseUrl: '/api',
        timeout: 30000,
        retryAttempts: 3
    },

    // WhatsApp API Configuration
    whatsapp: {
        baseUrl: 'https://app.notif.my.id/api/v2',
        apiKey: 'mm68fx5IvP2GIb2Wjq1760330685167',
        groupApiKey: 'v9hGLVqiRju78eOxEu1760336352759',
        groupId: '120363421578507033@g.us'
    },

    // Google Sheets Configuration
    googleSheets: {
        spreadsheetId: '1Ks4HDuMBYkSxWpSWUUGQfdYmsxdpHOIhKxM7L6mA6SA',
        chatLogsSheet: 'Chat Logs',
        knowledgeBaseSheet: 'Knowledge Base (untuk AI Agent)'
    },

    // AI Configuration
    ai: {
        openRouterApiKey: 'UpdSBYSgG1imME51',
        model: 'openai/gpt-oss-20b:free',
        fallbackModel: 'z-ai/glm-4.5-air:free'
    },

    // Google Places API
    googlePlaces: {
        apiKey: 'AIzaSyA3mdoObAf6k0aWRKt5KUvqiYl6PLgzkvY',
        searchRadius: 5000,
        location: '-6.3028,106.6528' // BSD area
    },

    // Dashboard Configuration
    dashboard: {
        refreshInterval: 30000, // 30 seconds
        maxChatHistory: 50,
        maxActivities: 20,
        itemsPerPage: 25
    },

    // Marketing Configuration
    marketing: {
        maxDailyLeads: 100,
        batchSize: 20,
        delayBetweenBatches: 10000, // 10 seconds
        retryAttempts: 3
    },

    // Customer Service Configuration
    customerService: {
        cooldownDurations: {
            normal: 2,      // minutes
            price: 12,      // minutes
            urgent: 8,      // minutes
            buying: 20      // minutes
        },
        maxMessagesPerDay: 50,
        escalationThreshold: 0.8
    },

    // Notification Configuration
    notifications: {
        adminPhone: '085771518231',
        adminApiKey: 'uuLfQdSU5Bn0px38Pu1758504793733'
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Make config available globally
window.CONFIG = CONFIG;