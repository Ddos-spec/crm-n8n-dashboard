// CRM Dashboard JavaScript dengan Webhook N8N Integration
class CRMDashboard {
    constructor() {
        this.currentTab = 'overview';
        this.customers = [];
        this.leads = [];
        this.escalations = [];
        this.activities = [];
        this.chats = [];
        this.apiConnector = null;
        this.connectionStatus = 'disconnected';
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing CRM Dashboard with N8N Webhook Integration');
        
        // Initialize webhook API connector
        this.apiConnector = window.webhookApiConnector || new WebhookAPIConnector();
        
        this.setupEventListeners();
        this.updateConnectionStatus('connecting');
        
        try {
            await this.testConnection();
            await this.loadInitialData();
            this.startRealTimeUpdates();
            this.updateConnectionStatus('connected');
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.updateConnectionStatus('disconnected');
            this.showError('Gagal terhubung ke sistem. Menggunakan data fallback.');
            await this.loadFallbackData();
        }
    }

    async testConnection() {
        console.log('🔍 Testing N8N connection...');
        const health = await this.apiConnector.healthCheck();
        console.log('Health check result:', health);
        return health;
    }

    updateConnectionStatus(status) {
        this.connectionStatus = status;
        const statusElement = document.getElementById('connection-status');
        const textElement = document.getElementById('connection-text');
        
        if (!statusElement || !textElement) return;
        
        // Remove all status classes
        statusElement.classList.remove('status-connected', 'status-connecting', 'status-disconnected');
        
        switch (status) {
            case 'connected':
                statusElement.classList.add('status-connected');
                textElement.textContent = 'N8N Connected';
                break;
            case 'connecting':
                statusElement.classList.add('status-connecting');
                textElement.textContent = 'Connecting to N8N...';
                break;
            case 'disconnected':
                statusElement.classList.add('status-disconnected');
                textElement.textContent = 'N8N Disconnected';
                break;
        }
        
        console.log(`📡 Connection status: ${status}`);
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const targetButton = event.currentTarget;
                this.switchTab(targetButton.dataset.tab, targetButton);
            });
        });

        // Refresh button
        const refreshButton = document.getElementById('refresh-data');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshAllData());
        }

        // Initialize tab indicator
        requestAnimationFrame(() => {
            const defaultTab = document.querySelector('.tab-button[data-tab="overview"]');
            if (defaultTab) {
                defaultTab.classList.remove('text-slate-500');
                defaultTab.classList.add('text-slate-900', 'font-semibold');
                defaultTab.setAttribute('aria-selected', 'true');
                this.updateTabIndicator(defaultTab);
            }
        });
    }

    switchTab(tabName, triggerButton = null) {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.remove('text-slate-900', 'font-semibold');
            button.classList.add('text-slate-500');
            button.setAttribute('aria-selected', 'false');
        });

        const activeButton = triggerButton || document.querySelector(`.tab-button[data-tab="${tabName}"]`);
        if (activeButton) {
            activeButton.classList.remove('text-slate-500');
            activeButton.classList.add('text-slate-900', 'font-semibold');
            activeButton.setAttribute('aria-selected', 'true');
        }

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        const targetContent = document.getElementById(`${tabName}-tab`);
        if (targetContent) {
            targetContent.classList.remove('hidden');
        }

        this.updateTabIndicator(activeButton);

        if (this.currentTab !== tabName) {
            this.currentTab = tabName;
            this.loadTabData(tabName);
        }
    }

    updateTabIndicator(activeButton) {
        const indicator = document.getElementById('tab-indicator');
        const tablist = document.getElementById('tablist');

        if (!indicator || !tablist || !activeButton) {
            return;
        }

        const { offsetWidth, offsetHeight, offsetLeft, offsetTop } = activeButton;
        indicator.style.width = `${offsetWidth}px`;
        indicator.style.height = `${offsetHeight}px`;
        indicator.style.transform = `translate(${offsetLeft}px, ${offsetTop}px)`;
        indicator.style.opacity = 1;
    }

    async loadInitialData() {
        this.showLoading(true);
        
        try {
            console.log('📊 Loading initial data via webhook...');
            
            await Promise.all([
                this.loadQuickStats(),
                this.loadOverviewData()
            ]);
            
            console.log('✅ Initial data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            this.showError('Gagal memuat data awal. Menggunakan data fallback.');
        } finally {
            this.showLoading(false);
        }
    }

    async loadFallbackData() {
        console.log('🔄 Loading fallback data...');
        
        // Use fallback data provider
        const fallbackProvider = new FallbackDataProvider();
        
        const stats = fallbackProvider.getFallbackData('getQuickStats');
        this.updateStatsDisplay(stats);
        
        const chats = fallbackProvider.getFallbackData('getRecentChats');
        this.renderChatMonitor(chats);
        
        const activities = fallbackProvider.getFallbackData('getRecentActivities');
        this.renderRecentActivities(activities);
        
        await this.renderAnalyticsCharts();
    }

    async loadQuickStats() {
        try {
            console.log('📈 Loading quick stats...');
            const stats = await this.apiConnector.getQuickStats();
            this.updateStatsDisplay(stats);
        } catch (error) {
            console.warn('⚠️ Failed to load quick stats:', error.message);
            // Fallback stats will be used by the connector
        }
    }

    updateStatsDisplay(stats) {
        if (stats) {
            document.getElementById('total-customers').textContent = stats.totalCustomers?.toLocaleString('id-ID') || '0';
            document.getElementById('total-leads').textContent = stats.totalLeads?.toLocaleString('id-ID') || '0';
            document.getElementById('total-escalations').textContent = stats.totalEscalations?.toLocaleString('id-ID') || '0';
            document.getElementById('response-rate').textContent = (stats.responseRate || 0) + '%';
        }
    }

    async loadOverviewData() {
        try {
            console.log('🔍 Loading overview data...');
            
            const [chats, activities] = await Promise.all([
                this.apiConnector.getRecentChats(10),
                this.apiConnector.getRecentActivities(20)
            ]);

            this.renderChatMonitor(chats);
            this.renderRecentActivities(activities);
            await this.renderAnalyticsCharts();
        } catch (error) {
            console.warn('⚠️ Failed to load overview data:', error.message);
        }
    }

    async loadTabData(tabName) {
        if (tabName === 'overview') {
            // Overview data already loaded
            return;
        }
        
        this.showLoading(true);
        
        try {
            console.log(`📁 Loading ${tabName} data...`);
            
            switch (tabName) {
                case 'customers':
                    await this.loadCustomerServiceData();
                    break;
                case 'marketing':
                    await this.loadMarketingData();
                    break;
                case 'analytics':
                    await this.loadAnalyticsData();
                    break;
            }
        } catch (error) {
            console.error(`❌ Error loading ${tabName} data:`, error);
            this.showError(`Gagal memuat data ${tabName}`);
        } finally {
            this.showLoading(false);
        }
    }

    async loadCustomerServiceData() {
        // Implementation for customer service tab
        console.log('👥 Loading customer service data...');
        // This would load customers, escalations, etc.
    }

    async loadMarketingData() {
        // Implementation for marketing tab
        console.log('📱 Loading marketing data...');
        // This would load leads, campaigns, etc.
    }

    async loadAnalyticsData() {
        // Implementation for analytics tab
        console.log('📊 Loading analytics data...');
        // This would load detailed analytics
    }

    // Render methods
    renderChatMonitor(chats) {
        const container = document.getElementById('chat-monitor');
        if (!container) return;

        if (!chats || chats.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 py-10 text-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor" class="h-10 w-10">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3h5.25M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0Zm-5.25 5.25 4.5 4.5" />
                    </svg>
                    <p class="mt-4 text-sm font-medium">Belum ada chat terbaru</p>
                </div>
            `;
            return;
        }

        container.innerHTML = chats.map(chat => {
            const isInbound = chat.message_type === 'in';
            const avatarTone = this.getChatAvatarTone(chat.message_type);
            const pillClasses = this.getClassificationPillClasses(chat.classification);
            const classificationLabel = this.formatClassificationLabel(chat.classification);
            const bubbleClasses = isInbound
                ? 'bg-white/80 border border-sky-100 text-slate-700'
                : 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-500/30';
            const alignment = isInbound ? 'flex-row' : 'flex-row-reverse';
            const metaAlignment = isInbound ? 'justify-start text-slate-400' : 'justify-end text-white/80';

            return `
                <div class="group flex ${alignment} items-start gap-3">
                    <div class="icon-ring flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${avatarTone.background} ${avatarTone.text}">
                        ${this.getChatIcon(chat.message_type)}
                    </div>
                    <div class="max-w-full flex-1 space-y-2 sm:max-w-md">
                        <div class="chat-bubble rounded-3xl px-4 py-3 ${bubbleClasses}">
                            <div class="flex items-center justify-between gap-3">
                                <p class="text-sm font-semibold ${isInbound ? 'text-slate-800' : 'text-white'}">${chat.customer_name}</p>
                                <span class="text-xs ${isInbound ? 'text-slate-400' : 'text-white/80'}">${this.formatTime(chat.created_at)}</span>
                            </div>
                            <p class="mt-2 text-sm ${isInbound ? 'text-slate-600' : 'text-white/90'}">${chat.content}</p>
                        </div>
                        <div class="flex items-center gap-2 ${metaAlignment}">
                            <span class="${pillClasses}">${classificationLabel}</span>
                            <span class="text-xs ${isInbound ? 'text-slate-400' : 'text-white/70'}">${chat.customer_phone}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderRecentActivities(activities) {
        const container = document.getElementById('recent-activities');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 py-10 text-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor" class="h-10 w-10">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h6m4.5 0a10.5 10.5 0 1 1-21 0 10.5 10.5 0 0 1 21 0Z" />
                    </svg>
                    <p class="mt-4 text-sm font-medium">Belum ada aktivitas terbaru</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => {
            const style = this.getActivityStyle(activity.type);
            return `
                <div class="activity-item flex items-start gap-4 rounded-2xl px-4 py-3">
                    <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${style.iconBg}">
                        ${style.icon}
                    </div>
                    <div class="flex-1 space-y-1">
                        <div class="flex items-center justify-between gap-3">
                            <p class="text-sm font-semibold text-slate-800">${activity.description}</p>
                            <span class="text-xs text-slate-400">${this.formatTime(activity.timestamp)}</span>
                        </div>
                        ${activity.customer ? `<p class="text-xs text-slate-500">Customer: <span class="font-medium text-slate-700">${activity.customer}</span></p>` : ''}
                        <span class="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${style.badge}">
                            ${style.badgeIcon}${style.label}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    async renderAnalyticsCharts() {
        try {
            console.log('📊 Rendering analytics charts...');
            
            // Get analytics data
            const [classifications, interactions] = await Promise.all([
                this.apiConnector.getMessageClassifications(),
                this.apiConnector.getInteractionTrends()
            ]);

            // Classification Chart
            const classificationTrace = {
                values: Object.values(classifications),
                labels: Object.keys(classifications).map(key => this.formatClassificationLabel(key)),
                type: 'pie',
                hole: 0.45,
                marker: {
                    colors: ['#2563eb', '#38bdf8', '#f97316', '#10b981'],
                    line: { color: '#ffffff', width: 2 }
                },
                hoverinfo: 'label+percent',
                textinfo: 'value'
            };

            const classificationLayout = {
                margin: { t: 10, b: 10, l: 10, r: 10 },
                showlegend: true,
                legend: {
                    orientation: 'h',
                    x: 0.5,
                    y: -0.2,
                    xanchor: 'center',
                    font: { family: 'Inter, sans-serif', color: '#475569' }
                },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: { family: 'Inter, sans-serif', color: '#0f172a' }
            };

            Plotly.newPlot('classification-chart', [classificationTrace], classificationLayout, {
                responsive: true,
                displayModeBar: false
            });

            // Interaction Chart
            const interactionTrace = {
                x: interactions.map(d => d.date),
                y: interactions.map(d => d.count),
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: '#2563eb', width: 3, shape: 'spline' },
                marker: {
                    color: '#2563eb',
                    size: 8,
                    line: { color: '#ffffff', width: 2 }
                },
                hovertemplate: '%{y} interaksi<extra>%{x}</extra>'
            };

            const interactionLayout = {
                margin: { t: 20, b: 40, l: 50, r: 20 },
                xaxis: {
                    title: '',
                    showgrid: true,
                    gridcolor: 'rgba(148, 163, 184, 0.25)',
                    tickfont: { color: '#64748b' }
                },
                yaxis: {
                    title: '',
                    showgrid: true,
                    gridcolor: 'rgba(148, 163, 184, 0.25)',
                    zeroline: false,
                    tickfont: { color: '#64748b' }
                },
                hovermode: 'x unified',
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                showlegend: false
            };

            Plotly.newPlot('interaction-chart', [interactionTrace], interactionLayout, {
                responsive: true,
                displayModeBar: false
            });
            
            console.log('✅ Analytics charts rendered successfully');
        } catch (error) {
            console.warn('⚠️ Failed to render analytics charts:', error.message);
        }
    }

    // Event handlers dan utility methods
    async contactCustomer(phone) {
        const message = prompt('Masukkan pesan untuk customer:');
        if (message) {
            try {
                await this.apiConnector.sendWhatsAppMessage(phone, message);
                this.showSuccess('Pesan berhasil dikirim');
            } catch (error) {
                this.showError('Gagal mengirim pesan');
            }
        }
    }

    async contactLead(phone, name) {
        const defaultMessage = `Halo ${name}, kami dari Tepat Laser. Kami melihat bisnis Anda mungkin membutuhkan layanan laser cutting. Boleh kami informasikan penawaran terbaik kami?`;
        const message = prompt('Pesan untuk lead:', defaultMessage);
        
        if (message) {
            try {
                await this.apiConnector.contactLead(phone, name, message);
                this.showSuccess('Pesan berhasil dikirim ke lead');
                // Refresh data
                await this.loadQuickStats();
            } catch (error) {
                this.showError('Gagal mengirim pesan ke lead');
            }
        }
    }

    async refreshAllData() {
        console.log('🔄 Refreshing all data...');
        this.updateConnectionStatus('connecting');
        
        try {
            // Clear cache
            if (this.apiConnector.clearCache) {
                this.apiConnector.clearCache();
            }
            
            // Test connection
            await this.testConnection();
            
            // Reload data
            await Promise.all([
                this.loadQuickStats(),
                this.loadOverviewData()
            ]);
            
            this.updateConnectionStatus('connected');
            this.showSuccess('Data berhasil diperbarui!');
        } catch (error) {
            console.error('❌ Failed to refresh data:', error);
            this.updateConnectionStatus('disconnected');
            this.showError('Gagal memperbarui data');
        }
    }

    // Real-time updates
    startRealTimeUpdates() {
        console.log('⏰ Starting real-time updates...');
        
        // Update chat monitor setiap 30 detik
        setInterval(async () => {
            if (this.currentTab === 'overview' && this.connectionStatus === 'connected') {
                try {
                    const chats = await this.apiConnector.getRecentChats(10);
                    this.renderChatMonitor(chats);
                } catch (error) {
                    console.warn('Failed to update chats:', error.message);
                }
            }
        }, 30000);

        // Update stats setiap 5 menit
        setInterval(async () => {
            if (this.connectionStatus === 'connected') {
                try {
                    await this.loadQuickStats();
                } catch (error) {
                    console.warn('Failed to update stats:', error.message);
                }
            }
        }, 300000);
        
        // Connection health check setiap 2 menit
        setInterval(async () => {
            try {
                await this.testConnection();
                if (this.connectionStatus !== 'connected') {
                    this.updateConnectionStatus('connected');
                }
            } catch (error) {
                if (this.connectionStatus !== 'disconnected') {
                    this.updateConnectionStatus('disconnected');
                }
            }
        }, 120000);
    }

    // Utility methods
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Baru saja';
        if (diff < 3600000) return Math.floor(diff / 60000) + ' menit lalu';
        if (diff < 86400000) return Math.floor(diff / 3600000) + ' jam lalu';
        return date.toLocaleDateString('id-ID');
    }

    getChatAvatarTone(type) {
        const tones = {
            in: { background: 'bg-sky-500/10', text: 'text-sky-600' },
            out: { background: 'bg-indigo-500/10', text: 'text-indigo-600' }
        };
        return tones[type] || tones.in;
    }

    getChatIcon(type) {
        if (type === 'out') {
            return `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-5 w-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 19.5v-15m0 0L7.5 9M12 4.5 16.5 9" />
                </svg>
            `;
        }
        return `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-5 w-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.749 0-5.362-.608-7.499-1.632Z" />
            </svg>
        `;
    }

    getClassificationPillClasses(classification) {
        const normalized = classification ? classification.toUpperCase() : '';
        const classes = {
            'AI_AGENT': 'bg-sky-50 text-sky-600 border-sky-100',
            'ESCALATE_PRICE': 'bg-amber-50 text-amber-600 border-amber-100',
            'ESCALATE_URGENT': 'bg-rose-50 text-rose-600 border-rose-100',
            'BUYING_READY': 'bg-emerald-50 text-emerald-600 border-emerald-100'
        };
        const colorClass = classes[normalized] || 'bg-slate-100 text-slate-600 border border-slate-200';
        return `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${colorClass}`;
    }

    formatClassificationLabel(value) {
        if (!value) return 'Tidak diketahui';
        const labels = {
            'AI_AGENT': 'AI Agent',
            'ESCALATE_PRICE': 'Escalate Price',
            'ESCALATE_URGENT': 'Escalate Urgent',
            'BUYING_READY': 'Buying Ready'
        };
        return labels[value.toUpperCase()] || value;
    }

    getActivityStyle(type) {
        const styles = {
            escalation: {
                iconBg: 'bg-rose-500/10 text-rose-600',
                badge: 'bg-rose-100 text-rose-600',
                icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>`,
                label: 'Escalation'
            },
            lead_contact: {
                iconBg: 'bg-sky-500/10 text-sky-600',
                badge: 'bg-sky-100 text-sky-600',
                icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75 11.25 12l10.5 5.25m0-10.5L11.25 12 2.25 6.75m19.5 10.5L11.25 12 2.25 17.25m19.5-10.5-10.5 5.25-10.5-5.25" /></svg>`,
                label: 'Kontak Lead'
            },
            conversion: {
                iconBg: 'bg-emerald-500/10 text-emerald-600',
                badge: 'bg-emerald-100 text-emerald-600',
                icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5h-1.5A2.25 2.25 0 0 0 4.5 9.75v8.25A2.25 2.25 0 0 0 6.75 20.25h10.5A2.25 2.25 0 0 0 19.5 18V9.75a2.25 2.25 0 0 0-2.25-2.25h-1.5m-7.5 0V5.25a3 3 0 0 1 3-3h1.5a3 3 0 0 1 3 3V7.5m-7.5 0h7.5" /></svg>`,
                label: 'Konversi'
            }
        };
        
        const style = styles[type] || styles.lead_contact;
        style.badgeIcon = `<span class="flex h-5 w-5 items-center justify-center rounded-full bg-white/50 text-current"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" class="h-2 w-2 fill-current"><circle cx="4" cy="4" r="4" /></svg></span>`;
        
        return style;
    }

    // UI helpers
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.toggle('hidden', !show);
        }
    }

    showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-check-circle mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-exclamation-circle mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏁 DOM loaded, initializing CRM Dashboard...');
    window.dashboard = new CRMDashboard();
});