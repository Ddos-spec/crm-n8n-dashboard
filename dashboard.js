// CRM Dashboard JavaScript
class CRMDashboard {
    constructor() {
        this.currentTab = 'overview';
        this.customers = [];
        this.leads = [];
        this.escalations = [];
        this.activities = [];
        this.chats = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.startRealTimeUpdates();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const targetButton = event.currentTarget;
                this.switchTab(targetButton.dataset.tab, targetButton);
            });
        });

        // Customer search and filter
        const customerSearch = document.getElementById('customer-search');
        const customerFilter = document.getElementById('customer-filter');
        
        if (customerSearch) {
            customerSearch.addEventListener('input', () => this.filterCustomers());
        }
        if (customerFilter) {
            customerFilter.addEventListener('change', () => this.filterCustomers());
        }

        // Marketing filters
        const applyFilters = document.getElementById('apply-filters');
        if (applyFilters) {
            applyFilters.addEventListener('click', () => this.applyMarketingFilters());
        }

        // Bulk actions
        const selectAllLeads = document.getElementById('select-all-leads');
        if (selectAllLeads) {
            selectAllLeads.addEventListener('change', () => this.toggleSelectAllLeads());
        }

        const exportLeads = document.getElementById('export-leads');
        if (exportLeads) {
            exportLeads.addEventListener('click', () => this.exportLeadsCSV());
        }

        const bulkContact = document.getElementById('bulk-contact');
        if (bulkContact) {
            bulkContact.addEventListener('click', () => this.bulkContactLeads());
        }

        // Refresh button
        const refreshButton = document.getElementById('refresh-data');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshAllData());
        }

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
            await Promise.all([
                this.loadQuickStats(),
                this.loadOverviewData()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Gagal memuat data awal');
        } finally {
            this.showLoading(false);
        }
    }

    async loadQuickStats() {
        try {
            // Simulate API calls with mock data
            const stats = await this.fetchQuickStats();
            
            document.getElementById('total-customers').textContent = stats.totalCustomers;
            document.getElementById('total-leads').textContent = stats.totalLeads;
            document.getElementById('total-escalations').textContent = stats.totalEscalations;
            document.getElementById('response-rate').textContent = stats.responseRate + '%';
        } catch (error) {
            console.error('Error loading quick stats:', error);
        }
    }

    async loadOverviewData() {
        try {
            const [chats, activities] = await Promise.all([
                this.fetchRecentChats(),
                this.fetchRecentActivities()
            ]);

            this.renderChatMonitor(chats);
            this.renderRecentActivities(activities);
            this.renderAnalyticsCharts();
        } catch (error) {
            console.error('Error loading overview data:', error);
        }
    }

    async loadTabData(tabName) {
        this.showLoading(true);
        
        try {
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
            console.error(`Error loading ${tabName} data:`, error);
            this.showError(`Gagal memuat data ${tabName}`);
        } finally {
            this.showLoading(false);
        }
    }

    async loadCustomerServiceData() {
        const [customers, escalations] = await Promise.all([
            this.fetchCustomers(),
            this.fetchEscalations()
        ]);

        this.customers = customers;
        this.escalations = escalations;
        
        this.renderCustomerList();
        this.renderEscalationsTable();
    }

    async loadMarketingData() {
        const [leads, campaignStats] = await Promise.all([
            this.fetchLeads(),
            this.fetchCampaignStats()
        ]);

        this.leads = leads;
        this.renderCampaignStats(campaignStats);
        this.renderLeadsTable();
    }

    async loadAnalyticsData() {
        const analyticsData = await this.fetchAnalyticsData();
        this.renderAnalyticsCharts(analyticsData);
        this.renderAnalyticsStats(analyticsData);
    }

    // Mock API methods - replace with real API calls
    async fetchQuickStats() {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
            totalCustomers: 1247,
            totalLeads: 892,
            totalEscalations: 23,
            responseRate: 78
        };
    }

    async fetchRecentChats() {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        return [
            {
                id: 1,
                customerName: 'Bapak Andi',
                phone: '6281234567890',
                message: 'Halo, saya ingin pesan laser cutting untuk pagar rumah',
                type: 'in',
                timestamp: new Date().toISOString(),
                classification: 'BUYING_READY'
            },
            {
                id: 2,
                customerName: 'AI Agent',
                phone: '6281234567890',
                message: 'Baik Pak Andi, untuk pesanan laser cutting pagar rumah, bisa tolong informasikan ukuran dan material yang diinginkan?',
                type: 'out',
                timestamp: new Date(Date.now() - 300000).toISOString(),
                classification: 'AI_AGENT'
            },
            {
                id: 3,
                customerName: 'Ibu Siti',
                phone: '6289876543210',
                message: 'Berapa harga laser cutting akrilik ukuran 50x30 cm?',
                type: 'in',
                timestamp: new Date(Date.now() - 600000).toISOString(),
                classification: 'ESCALATE_PRICE'
            }
        ];
    }

    async fetchRecentActivities() {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        return [
            {
                id: 1,
                type: 'escalation',
                description: 'Escalation baru: Customer minta harga urgent',
                timestamp: new Date().toISOString(),
                customer: 'Bapak Budi'
            },
            {
                id: 2,
                type: 'lead_contact',
                description: 'Berhasil kontak 15 leads baru',
                timestamp: new Date(Date.now() - 900000).toISOString(),
                customer: null
            },
            {
                id: 3,
                type: 'conversion',
                description: 'Customer mengkonfirmasi pesanan',
                timestamp: new Date(Date.now() - 1800000).toISOString(),
                customer: 'Ibu Ratna'
            }
        ];
    }

    async fetchCustomers() {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return [
            {
                id: 1,
                name: 'Bapak Andi',
                phone: '6281234567890',
                location: 'Jakarta Selatan',
                material: 'Besi',
                conversationStage: 'waiting_size',
                lastInteraction: new Date().toISOString(),
                status: 'active',
                isCooldownActive: false
            },
            {
                id: 2,
                name: 'Ibu Siti',
                phone: '6289876543210',
                location: 'Tangerang',
                material: 'Akrilik',
                conversationStage: 'greeting',
                lastInteraction: new Date(Date.now() - 3600000).toISOString(),
                status: 'cooldown',
                isCooldownActive: true
            },
            {
                id: 3,
                name: 'Bapak Budi',
                phone: '6281122334455',
                location: 'Bekasi',
                material: 'Stainless Steel',
                conversationStage: 'escalated',
                lastInteraction: new Date(Date.now() - 7200000).toISOString(),
                status: 'escalated',
                isCooldownActive: false
            }
        ];
    }

    async fetchEscalations() {
        await new Promise(resolve => setTimeout(resolve, 700));
        
        return [
            {
                id: 1,
                customerName: 'Bapak Budi',
                type: 'ESCALATE_PRICE',
                priority: 'high',
                status: 'open',
                reason: 'Customer minta penawaran harga segera',
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                customerName: 'Ibu Ratna',
                type: 'ESCALATE_URGENT',
                priority: 'urgent',
                status: 'in_progress',
                reason: 'Komplain keterlambatan pengiriman',
                createdAt: new Date(Date.now() - 3600000).toISOString()
            }
        ];
    }

    async fetchLeads() {
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        return [
            {
                id: 1,
                name: 'CV. Surya Laser',
                phone: '6281234567890',
                marketSegment: 'advertising_signage',
                leadScore: 85,
                status: 'new',
                address: 'Jl. Sudirman No. 123, Jakarta',
                rating: 4.5
            },
            {
                id: 2,
                name: 'Bengkel Las Sejahtera',
                phone: '6289876543210',
                marketSegment: 'metal_fabrication',
                leadScore: 72,
                status: 'contacted',
                address: 'Jl. Ahmad Yani No. 45, Tangerang',
                rating: 4.2
            },
            {
                id: 3,
                name: 'Furniture Indah',
                phone: '6281122334455',
                marketSegment: 'furniture_manufacturing',
                leadScore: 68,
                status: 'new',
                address: 'Jl. Gatot Subroto No. 78, Bekasi',
                rating: 4.0
            }
        ];
    }

    async fetchCampaignStats() {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
            totalSent: 156,
            totalDelivered: 142,
            totalFailed: 14,
            successRate: 91.0,
            responseCount: 23,
            conversionCount: 8
        };
    }

    async fetchAnalyticsData() {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        return {
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
            responseTimes: {
                average: 2.3,
                fastest: 0.5,
                slowest: 8.7
            },
            targets: {
                daily: 100,
                contacted: 78,
                percentage: 78
            }
        };
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
            const isInbound = chat.type === 'in';
            const avatarTone = this.getChatAvatarTone(chat.type);
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
                        ${this.getChatIcon(chat.type)}
                    </div>
                    <div class="max-w-full flex-1 space-y-2 sm:max-w-md">
                        <div class="chat-bubble rounded-3xl px-4 py-3 ${bubbleClasses}">
                            <div class="flex items-center justify-between gap-3">
                                <p class="text-sm font-semibold ${isInbound ? 'text-slate-800' : 'text-white'}">${chat.customerName}</p>
                                <span class="text-xs ${isInbound ? 'text-slate-400' : 'text-white/80'}">${this.formatTime(chat.timestamp)}</span>
                            </div>
                            <p class="mt-2 text-sm ${isInbound ? 'text-slate-600' : 'text-white/90'}">${chat.message}</p>
                        </div>
                        <div class="flex items-center gap-2 ${metaAlignment}">
                            <span class="${pillClasses}">${classificationLabel}</span>
                            <span class="text-xs ${isInbound ? 'text-slate-400' : 'text-white/70'}">${chat.phone}</span>
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

    renderCustomerList() {
        const container = document.getElementById('customer-list');
        if (!container) return;

        container.innerHTML = this.customers.map(customer => `
            <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" 
                 onclick="dashboard.selectCustomer(${customer.id})">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                        <i class="fas fa-user text-white"></i>
                    </div>
                    <div>
                        <p class="font-medium text-gray-900">${customer.name}</p>
                        <p class="text-sm text-gray-500">${customer.phone}</p>
                        <p class="text-xs text-gray-400">${customer.location || 'Lokasi tidak diketahui'}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${this.getStatusColor(customer.status)}">
                        ${this.getStatusLabel(customer.status)}
                    </span>
                    <p class="text-xs text-gray-400 mt-1">${this.formatTime(customer.lastInteraction)}</p>
                </div>
            </div>
        `).join('');
    }

    renderCustomerDetails(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        const container = document.getElementById('customer-details');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center mb-4">
                <div class="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center mx-auto mb-3">
                    <i class="fas fa-user text-white text-2xl"></i>
                </div>
                <h4 class="font-semibold text-gray-900">${customer.name}</h4>
                <p class="text-sm text-gray-500">${customer.phone}</p>
            </div>
            
            <div class="space-y-3">
                <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Lokasi:</span>
                    <span class="text-sm font-medium">${customer.location || '-'}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Material:</span>
                    <span class="text-sm font-medium">${customer.material || '-'}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Stage:</span>
                    <span class="text-sm font-medium">${customer.conversationStage}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Status:</span>
                    <span class="text-sm font-medium">${customer.status}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Cooldown:</span>
                    <span class="text-sm font-medium">${customer.isCooldownActive ? 'Aktif' : 'Tidak Aktif'}</span>
                </div>
            </div>
            
            <div class="mt-4 space-y-2">
                <button class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                    <i class="fas fa-comment mr-2"></i>Lihat Chat History
                </button>
                <button class="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                    <i class="fas fa-phone mr-2"></i>Hubungi Customer
                </button>
                ${customer.status === 'escalated' ? `
                    <button class="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">
                        <i class="fas fa-handshake mr-2"></i>Handle Escalation
                    </button>
                ` : ''}
            </div>
        `;
    }

    renderEscalationsTable() {
        const container = document.getElementById('escalations-table');
        if (!container) return;

        container.innerHTML = this.escalations.map(escalation => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${escalation.customerName}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ${escalation.type}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${this.getPriorityColor(escalation.priority)}">
                        ${escalation.priority}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${this.getStatusColor(escalation.status)}">
                        ${escalation.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${this.formatTime(escalation.createdAt)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-eye mr-1"></i>Detail
                    </button>
                    <button class="text-green-600 hover:text-green-900">
                        <i class="fas fa-handshake mr-1"></i>Handle
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderCampaignStats(stats) {
        const container = document.getElementById('campaign-stats');
        if (!container) return;

        container.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div class="text-center p-4 bg-blue-50 rounded-lg">
                    <div class="text-2xl font-bold text-blue-600">${stats.totalSent}</div>
                    <div class="text-sm text-gray-600">Total Terkirim</div>
                </div>
                <div class="text-center p-4 bg-green-50 rounded-lg">
                    <div class="text-2xl font-bold text-green-600">${stats.totalDelivered}</div>
                    <div class="text-sm text-gray-600">Terkirim</div>
                </div>
                <div class="text-center p-4 bg-red-50 rounded-lg">
                    <div class="text-2xl font-bold text-red-600">${stats.totalFailed}</div>
                    <div class="text-sm text-gray-600">Gagal</div>
                </div>
                <div class="text-center p-4 bg-purple-50 rounded-lg">
                    <div class="text-2xl font-bold text-purple-600">${stats.successRate}%</div>
                    <div class="text-sm text-gray-600">Sukses Rate</div>
                </div>
            </div>
            <div class="mt-4 space-y-2">
                <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Response:</span>
                    <span class="font-semibold">${stats.responseCount}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-sm text-gray-600">Konversi:</span>
                    <span class="font-semibold">${stats.conversionCount}</span>
                </div>
            </div>
        `;
    }

    renderLeadsTable() {
        const container = document.getElementById('leads-table');
        if (!container) return;

        container.innerHTML = this.leads.map(lead => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <input type="checkbox" class="lead-checkbox rounded" value="${lead.id}">
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${lead.name}</div>
                    <div class="text-sm text-gray-500">${lead.address}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${lead.phone}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ${lead.marketSegment}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="text-sm font-medium text-gray-900">${lead.leadScore}</div>
                        <div class="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-600 h-2 rounded-full" style="width: ${lead.leadScore}%"></div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${this.getLeadStatusColor(lead.status)}">
                        ${this.getLeadStatusLabel(lead.status)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-eye mr-1"></i>Detail
                    </button>
                    <button class="text-green-600 hover:text-green-900">
                        <i class="fas fa-paper-plane mr-1"></i>Kontak
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderAnalyticsCharts(data = null) {
        // Classification Chart
        const classificationData = data ? data.classifications : {
            'AI_AGENT': 45,
            'ESCALATE_PRICE': 25,
            'ESCALATE_URGENT': 15,
            'BUYING_READY': 15
        };

        const palette = CONFIG?.ui?.chartPalette || {};
        const classificationTrace = {
            values: Object.values(classificationData),
            labels: Object.keys(classificationData),
            type: 'pie',
            hole: 0.45,
            marker: {
                colors: palette.pie || ['#2563eb', '#38bdf8', '#f97316', '#10b981'],
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
        const interactionData = data ? data.interactions : [
            { date: '2024-01-01', count: 120 },
            { date: '2024-01-02', count: 135 },
            { date: '2024-01-03', count: 148 },
            { date: '2024-01-04', count: 162 },
            { date: '2024-01-05', count: 178 }
        ];

        const interactionTrace = {
            x: interactionData.map(d => d.date),
            y: interactionData.map(d => d.count),
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: palette.line || '#2563eb', width: 3, shape: 'spline' },
            marker: {
                color: palette.line || '#2563eb',
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

        // AI Performance Chart
        const aiPerformanceTrace = {
            x: ['AI_AGENT', 'ESCALATE_PRICE', 'ESCALATE_URGENT', 'BUYING_READY'],
            y: [92, 87, 94, 89],
            type: 'bar',
            marker: {
                color: palette.bar || ['#2563eb', '#38bdf8', '#f97316', '#10b981'],
                line: { color: '#ffffff', width: 1.5 }
            }
        };

        const aiPerformanceLayout = {
            margin: { t: 20, b: 60, l: 50, r: 20 },
            xaxis: {
                title: '',
                tickfont: { color: '#475569' },
                showgrid: false
            },
            yaxis: {
                title: 'Akurasi (%)',
                gridcolor: 'rgba(148, 163, 184, 0.25)',
                tickfont: { color: '#475569' }
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            showlegend: false,
            font: { family: 'Inter, sans-serif', color: '#0f172a' }
        };

        Plotly.newPlot('ai-performance-chart', [aiPerformanceTrace], aiPerformanceLayout, {
            responsive: true,
            displayModeBar: false
        });

        // Marketing Conversion Chart
        const conversionTrace = {
            x: ['Sent', 'Delivered', 'Responded', 'Converted'],
            y: [156, 142, 23, 8],
            type: 'funnel',
            marker: {
                color: palette.funnel || ['#94a3b8', '#2563eb', '#f97316', '#10b981']
            }
        };

        const conversionLayout = {
            margin: { t: 20, b: 40, l: 40, r: 20 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: 'Inter, sans-serif', color: '#0f172a' },
            showlegend: false
        };

        Plotly.newPlot('marketing-conversion-chart', [conversionTrace], conversionLayout, {
            responsive: true,
            displayModeBar: false
        });
    }

    renderAnalyticsStats(data) {
        if (data && data.responseTimes) {
            document.getElementById('avg-response-time').textContent = data.responseTimes.average + ' detik';
            document.getElementById('fastest-response-time').textContent = data.responseTimes.fastest + ' detik';
            document.getElementById('slowest-response-time').textContent = data.responseTimes.slowest + ' detik';
        }

        if (data && data.targets) {
            document.getElementById('contacts-today').textContent = data.targets.contacted;
            document.getElementById('target-percentage').textContent = data.targets.percentage + '%';
        }
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
        const palette = CONFIG?.ui?.classificationPills || {};
        const colorClass = palette[normalized] || 'bg-slate-100 text-slate-600 border border-slate-200';

        return `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${colorClass}`;
    }

    formatClassificationLabel(value) {
        if (!value) return 'Tidak diketahui';
        return value
            .toLowerCase()
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    getActivityStyle(type) {
        const badgeConfig = CONFIG?.ui?.activityBadges || {};
        const styles = badgeConfig[type] || badgeConfig.default || {
            iconBg: 'bg-slate-500/10 text-slate-600',
            badge: 'bg-slate-100 text-slate-600'
        };

        const iconMap = {
            escalation: `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-5 w-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
            `,
            lead_contact: `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-5 w-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75 11.25 12l10.5 5.25m0-10.5L11.25 12 2.25 6.75m19.5 10.5L11.25 12 2.25 17.25m19.5-10.5-10.5 5.25-10.5-5.25" />
                </svg>
            `,
            conversion: `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-5 w-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5h-1.5A2.25 2.25 0 0 0 4.5 9.75v8.25A2.25 2.25 0 0 0 6.75 20.25h10.5A2.25 2.25 0 0 0 19.5 18V9.75a2.25 2.25 0 0 0-2.25-2.25h-1.5m-7.5 0V5.25a3 3 0 0 1 3-3h1.5a3 3 0 0 1 3 3V7.5m-7.5 0h7.5" />
                </svg>
            `,
            default: `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-5 w-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75h-.008a.75.75 0 0 1-.75-.75V11.25Zm.75 2.25h.008v3h-.008v-3ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
            `
        };

        const labelMap = {
            escalation: 'Escalation',
            lead_contact: 'Kontak Lead',
            conversion: 'Konversi',
            default: 'Aktivitas'
        };

        const badgeIcon = `
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-white/50 text-current">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" class="h-2 w-2 fill-current"><circle cx="4" cy="4" r="4" /></svg>
            </span>
        `;

        return {
            iconBg: styles.iconBg,
            badge: styles.badge,
            icon: iconMap[type] || iconMap.default,
            badgeIcon,
            label: labelMap[type] || labelMap.default
        };
    }

    getStatusColor(status) {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'cooldown': return 'bg-yellow-100 text-yellow-800';
            case 'escalated': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    getStatusLabel(status) {
        switch (status) {
            case 'active': return 'Aktif';
            case 'cooldown': return 'Cooldown';
            case 'escalated': return 'Escalated';
            default: return status;
        }
    }

    getPriorityColor(priority) {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-800';
            case 'high': return 'bg-orange-100 text-orange-800';
            case 'normal': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    getLeadStatusColor(status) {
        switch (status) {
            case 'new': return 'bg-blue-100 text-blue-800';
            case 'contacted': return 'bg-green-100 text-green-800';
            case 'invalid_whatsapp': return 'bg-red-100 text-red-800';
            case 'blocked': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    getLeadStatusLabel(status) {
        switch (status) {
            case 'new': return 'Baru';
            case 'contacted': return 'Dikontak';
            case 'invalid_whatsapp': return 'WhatsApp Invalid';
            case 'blocked': return 'Terblokir';
            default: return status;
        }
    }

    // Event handlers
    selectCustomer(customerId) {
        this.renderCustomerDetails(customerId);
    }

    filterCustomers() {
        const searchTerm = document.getElementById('customer-search').value.toLowerCase();
        const filterStatus = document.getElementById('customer-filter').value;
        
        // Filter logic here
        console.log('Filtering customers:', { searchTerm, filterStatus });
    }

    applyMarketingFilters() {
        const segment = document.getElementById('segment-filter').value;
        const status = document.getElementById('contact-status-filter').value;
        const score = document.getElementById('lead-score-filter').value;
        
        console.log('Applying marketing filters:', { segment, status, score });
    }

    toggleSelectAllLeads() {
        const checkboxes = document.querySelectorAll('.lead-checkbox');
        const selectAll = document.getElementById('select-all-leads');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll.checked;
        });
    }

    exportLeadsCSV() {
        console.log('Exporting leads to CSV');
        this.showSuccess('Export leads berhasil! File CSV akan diunduh.');
    }

    bulkContactLeads() {
        const selectedLeads = document.querySelectorAll('.lead-checkbox:checked');
        console.log('Bulk contacting leads:', selectedLeads.length);
        this.showSuccess(`Mengontak ${selectedLeads.length} leads...`);
    }

    refreshAllData() {
        this.showLoading(true);
        
        setTimeout(() => {
            this.loadInitialData();
            this.loadTabData(this.currentTab);
            this.showLoading(false);
            this.showSuccess('Data berhasil diperbarui!');
        }, 2000);
    }

    // Real-time updates
    startRealTimeUpdates() {
        // Update chat monitor every 30 seconds
        setInterval(() => {
            this.fetchRecentChats().then(chats => {
                this.renderChatMonitor(chats);
            });
        }, 30000);

        // Update stats every 5 minutes
        setInterval(() => {
            this.loadQuickStats();
        }, 300000);
    }

    // UI helpers
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.toggle('hidden', !show);
        }
    }

    showSuccess(message) {
        // Create and show success notification
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
        // Create and show error notification
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
    window.dashboard = new CRMDashboard();
});