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

    // UI Configuration
    ui: {
        chartPalette: {
            pie: ['#2563eb', '#38bdf8', '#f97316', '#10b981'],
            line: '#2563eb',
            bar: ['#2563eb', '#1d4ed8', '#22d3ee', '#10b981'],
            funnel: ['#94a3b8', '#2563eb', '#f97316', '#10b981']
        },
        classificationPills: {
            AI_AGENT: 'bg-sky-50 text-sky-600 border-sky-100',
            ESCALATE_PRICE: 'bg-amber-50 text-amber-600 border-amber-100',
            ESCALATE_URGENT: 'bg-rose-50 text-rose-600 border-rose-100',
            BUYING_READY: 'bg-emerald-50 text-emerald-600 border-emerald-100'
        },
        activityBadges: {
            escalation: {
                iconBg: 'bg-rose-500/10 text-rose-600',
                badge: 'bg-rose-100 text-rose-600'
            },
            lead_contact: {
                iconBg: 'bg-sky-500/10 text-sky-600',
                badge: 'bg-sky-100 text-sky-600'
            },
            conversion: {
                iconBg: 'bg-emerald-500/10 text-emerald-600',
                badge: 'bg-emerald-100 text-emerald-600'
            },
            default: {
                iconBg: 'bg-slate-500/10 text-slate-600',
                badge: 'bg-slate-100 text-slate-600'
            }
        }
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
