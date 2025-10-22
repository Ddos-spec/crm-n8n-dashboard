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
        webhookUrl: 'https://projek-n8n-n8n.qk6yxt.easypanel.host/webhook/crm',
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
        retryAttempts: 3,
        cacheTimeout: 30000, // 30 seconds
        maxConcurrentRequests: 10
    },

    // WhatsApp API Configuration - Dari workflow yang ada
    whatsapp: {
        baseUrl: 'https://app.notif.my.id/api/v2',
        apiKey: 'mm68fx5IvP2GIb2Wjq1760330685167',
        groupApiKey: 'v9hGLVqiRju78eOxEu1760336352759',
        groupId: '120363421578507033@g.us',
        adminPhone: '085771518231',
        adminApiKey: 'uuLfQdSU5Bn0px38Pu1758504793733'
    },

    // Google Sheets Configuration - Dari workflow yang ada
    googleSheets: {
        spreadsheetId: '1Ks4HDuMBYkSxWpSWUUGQfdYmsxdpHOIhKxM7L6mA6SA',
        chatLogsSheet: 'Chat Logs',
        knowledgeBaseSheet: 'Knowledge Base (untuk AI Agent)',
        escalationsSheet: 'Escalations',
        campaignSheet: 'Campaign Logs'
    },

    // AI Configuration - OpenRouter dari workflow
    ai: {
        openRouterApiKey: 'UpdSBYSgG1imME51',
        model: 'openai/gpt-oss-20b:free',
        fallbackModel: 'z-ai/glm-4.5-air:free',
        maxTokens: 1000,
        temperature: 0.7
    },

    // Google Places API - Untuk scraping leads
    googlePlaces: {
        apiKey: 'AIzaSyA3mdoObAf6k0aWRKt5KUvqiYl6PLgzkvY',
        searchRadius: 5000,
        location: '-6.3028,106.6528', // BSD area
        language: 'id',
        region: 'id'
    },

    // Dashboard Configuration
    dashboard: {
        refreshInterval: 30000, // 30 seconds
        maxChatHistory: 50,
        maxActivities: 20,
        itemsPerPage: 25,
        autoRefresh: true,
        enableNotifications: true
    },

    // Marketing Configuration
    marketing: {
        maxDailyLeads: 100,
        batchSize: 20,
        delayBetweenBatches: 10000, // 10 seconds
        retryAttempts: 3,
        campaignSchedule: '08:00', // Daily campaign time
        segments: {
            advertising_signage: 'Advertising & Signage',
            metal_fabrication: 'Metal Fabrication', 
            furniture_manufacturing: 'Furniture Manufacturing',
            automotive_workshop: 'Automotive Workshop',
            interior_design: 'Interior Design',
            general: 'General'
        }
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
        escalationThreshold: 0.8,
        autoEscalationEnabled: true,
        workingHours: {
            start: '08:00',
            end: '17:00',
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        }
    },

    // Classification Types - Sesuai dengan N8N workflow
    classifications: {
        AI_AGENT: {
            label: 'AI Agent',
            color: 'sky',
            description: 'Handled by AI agent'
        },
        ESCALATE_PRICE: {
            label: 'Escalate Price',
            color: 'amber', 
            description: 'Price inquiry needs human attention'
        },
        ESCALATE_URGENT: {
            label: 'Escalate Urgent',
            color: 'rose',
            description: 'Urgent matter needs immediate attention'
        },
        BUYING_READY: {
            label: 'Buying Ready',
            color: 'emerald',
            description: 'Customer ready to purchase'
        }
    },

    // UI Configuration
    ui: {
        theme: 'light',
        chartPalette: {
            pie: ['#2563eb', '#38bdf8', '#f97316', '#10b981', '#a855f7', '#ef4444'],
            line: '#2563eb',
            bar: ['#2563eb', '#1d4ed8', '#22d3ee', '#10b981', '#f97316', '#ef4444'],
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
        },
        animations: {
            enabled: true,
            duration: 300
        }
    },

    // Business Logic Configuration
    business: {
        company: {
            name: 'PT Tepat Laser',
            address: 'Tangerang Selatan',
            phone: '+62 857-7151-8231',
            email: 'admin@tepatlaser.com',
            website: 'https://tepatlaser.com'
        },
        services: [
            'Laser Cutting Plat',
            'Laser Cutting Akrilik', 
            'Laser Cutting Kayu',
            'Laser Cutting MDF',
            'Custom Design'
        ],
        materials: [
            'Stainless Steel',
            'Mild Steel', 
            'Aluminum',
            'Akrilik',
            'Kayu',
            'MDF'
        ]
    },

    // Notification Configuration  
    notifications: {
        adminPhone: '085771518231',
        adminApiKey: 'uuLfQdSU5Bn0px38Pu1758504793733',
        escalationNotifications: true,
        dailyReports: true,
        systemAlerts: true,
        reportTime: '18:00'
    },

    // Feature Flags
    features: {
        realTimeUpdates: true,
        autoEscalation: true,
        bulkOperations: true,
        advancedAnalytics: true,
        exportFunctionality: true,
        webhookIntegration: true,
        campaignAutomation: true
    },

    // Error Handling
    errorHandling: {
        maxRetries: 3,
        retryDelay: 1000, // ms
        showErrorDetails: true, // Development only
        logErrors: true,
        fallbackToCache: true
    },

    // Performance Configuration
    performance: {
        enableCaching: true,
        cacheSize: 100, // Number of cached requests
        lazyLoading: true,
        virtualScrolling: false, // For large lists
        compressionEnabled: true
    },

    // Security Configuration
    security: {
        sanitizeInputs: true,
        validateApiResponses: true,
        encryptSensitiveData: false, // Not needed for this setup
        rateLimiting: {
            enabled: true,
            maxRequests: 100,
            windowMs: 60000 // 1 minute
        }
    },

    // Development Configuration
    development: {
        debugMode: false,
        mockData: false,
        enableConsoleLogging: true,
        showPerformanceMetrics: false
    }
};

// Environment Detection
if (typeof window !== 'undefined') {
    // Browser environment
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    CONFIG.development.debugMode = isDevelopment;
    CONFIG.development.mockData = isDevelopment;
    CONFIG.errorHandling.showErrorDetails = isDevelopment;
}

// Validation Functions
CONFIG.validate = function() {
    const required = [
        'database.host',
        'database.database', 
        'database.username',
        'database.password',
        'whatsapp.apiKey',
        'n8n.webhookUrl'
    ];
    
    const missing = [];
    
    required.forEach(path => {
        const keys = path.split('.');
        let value = this;
        
        for (const key of keys) {
            value = value[key];
            if (value === undefined) {
                missing.push(path);
                break;
            }
        }
    });
    
    if (missing.length > 0) {
        console.warn('Missing required configuration:', missing);
        return false;
    }
    
    return true;
};

// Helper Functions
CONFIG.getDatabaseUrl = function() {
    return `postgres://${this.database.username}:${this.database.password}@${this.database.host}:${this.database.port}/${this.database.database}`;
};

CONFIG.getWhatsAppUrl = function(endpoint = 'send-message') {
    return `${this.whatsapp.baseUrl}/${endpoint}`;
};

CONFIG.getN8NWebhookUrl = function(type = 'crm') {
    return `${this.n8n.webhookUrl}${type === 'crm1' ? '1' : ''}`;
};

CONFIG.isWorkingHours = function() {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
    
    const isWorkingDay = this.customerService.workingHours.days.includes(currentDay);
    const isWorkingTime = currentTime >= this.customerService.workingHours.start && 
                         currentTime <= this.customerService.workingHours.end;
    
    return isWorkingDay && isWorkingTime;
};

CONFIG.getClassificationConfig = function(type) {
    return this.classifications[type] || {
        label: type,
        color: 'gray',
        description: 'Unknown classification'
    };
};

CONFIG.getMarketSegmentLabel = function(segment) {
    return this.marketing.segments[segment] || segment;
};

// Initialize validation
if (typeof window !== 'undefined') {
    // Validate configuration on load
    setTimeout(() => {
        if (!CONFIG.validate()) {
            console.error('Configuration validation failed. Some features may not work properly.');
        } else {
            console.log('✅ Configuration validated successfully');
        }
    }, 100);
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Make config available globally in browser
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    
    // Log configuration in development
    if (CONFIG.development.enableConsoleLogging) {
        console.log('🔧 CRM Dashboard Configuration loaded:', {
            database: `${CONFIG.database.host}:${CONFIG.database.port}/${CONFIG.database.database}`,
            n8nWebhook: CONFIG.n8n.webhookUrl,
            whatsappApi: CONFIG.whatsapp.baseUrl,
            features: Object.keys(CONFIG.features).filter(key => CONFIG.features[key])
        });
    }
}