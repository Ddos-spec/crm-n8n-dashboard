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
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
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
        const refreshButton = document.querySelector('button:has(.fa-sync-alt)');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshAllData());
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active', 'border-blue-500', 'text-blue-600');
            button.classList.add('border-transparent', 'text-gray-500');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.remove('border-transparent', 'text-gray-500');
            activeTab.classList.add('active', 'border-blue-500', 'text-blue-600');
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        const targetContent = document.getElementById(`${tabName}-tab`);
        if (targetContent) {
            targetContent.classList.remove('hidden');
        }

        this.currentTab = tabName;
        this.loadTabData(tabName);
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

        container.innerHTML = chats.map(chat => `
            <div class="flex items-start space-x-3 p-3 rounded-lg ${chat.type === 'in' ? 'bg-blue-50' : 'bg-gray-50'}">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 rounded-full ${chat.type === 'in' ? 'bg-blue-500' : 'bg-gray-500'} flex items-center justify-center">
                        <i class="fas ${chat.type === 'in' ? 'fa-user' : 'fa-robot'} text-white text-sm"></i>
                    </div>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <p class="text-sm font-medium text-gray-900">${chat.customerName}</p>
                        <span class="text-xs text-gray-500">${this.formatTime(chat.timestamp)}</span>
                    </div>
                    <p class="text-sm text-gray-700 mt-1">${chat.message}</p>
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                        ${chat.classification}
                    </span>
                </div>
            </div>
        `).join('');
    }

    renderRecentActivities(activities) {
        const container = document.getElementById('recent-activities');
        if (!container) return;

        container.innerHTML = activities.map(activity => `
            <div class="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 rounded-full ${this.getActivityColor(activity.type)} flex items-center justify-center">
                        <i class="fas ${this.getActivityIcon(activity.type)} text-white text-sm"></i>
                    </div>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900">${activity.description}</p>
                    ${activity.customer ? `<p class="text-sm text-gray-500">Customer: ${activity.customer}</p>` : ''}
                    <p class="text-xs text-gray-400">${this.formatTime(activity.timestamp)}</p>
                </div>
            </div>
        `).join('');
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

        const classificationTrace = {
            values: Object.values(classificationData),
            labels: Object.keys(classificationData),
            type: 'pie',
            hole: 0.4,
            marker: {
                colors: ['#3B82F6', '#EF4444', '#F59E0B', '#10B981']
            }
        };

        const classificationLayout = {
            margin: { t: 0, b: 0, l: 0, r: 0 },
            showlegend: true,
            legend: { orientation: 'h', x: 0, y: -0.1 }
        };

        Plotly.newPlot('classification-chart', [classificationTrace], classificationLayout, {responsive: true});

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
            line: { color: '#3B82F6', width: 3 },
            marker: { color: '#3B82F6', size: 8 }
        };

        const interactionLayout = {
            margin: { t: 20, b: 40, l: 40, r: 20 },
            xaxis: { title: 'Tanggal' },
            yaxis: { title: 'Jumlah Interaksi' },
            showlegend: false
        };

        Plotly.newPlot('interaction-chart', [interactionTrace], interactionLayout, {responsive: true});

        // AI Performance Chart
        const aiPerformanceTrace = {
            x: ['AI_AGENT', 'ESCALATE_PRICE', 'ESCALATE_URGENT', 'BUYING_READY'],
            y: [92, 87, 94, 89],
            type: 'bar',
            marker: { color: ['#3B82F6', '#EF4444', '#F59E0B', '#10B981'] }
        };

        const aiPerformanceLayout = {
            margin: { t: 20, b: 60, l: 40, r: 20 },
            xaxis: { title: 'Klasifikasi' },
            yaxis: { title: 'Akurasi (%)' },
            showlegend: false
        };

        Plotly.newPlot('ai-performance-chart', [aiPerformanceTrace], aiPerformanceLayout, {responsive: true});

        // Marketing Conversion Chart
        const conversionTrace = {
            x: ['Sent', 'Delivered', 'Responded', 'Converted'],
            y: [156, 142, 23, 8],
            type: 'funnel',
            marker: { color: ['#6B7280', '#3B82F6', '#F59E0B', '#10B981'] }
        };

        const conversionLayout = {
            margin: { t: 20, b: 40, l: 40, r: 20 },
            showlegend: false
        };

        Plotly.newPlot('marketing-conversion-chart', [conversionTrace], conversionLayout, {responsive: true});
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

    getActivityColor(type) {
        switch (type) {
            case 'escalation': return 'bg-red-500';
            case 'lead_contact': return 'bg-blue-500';
            case 'conversion': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    }

    getActivityIcon(type) {
        switch (type) {
            case 'escalation': return 'fa-exclamation-triangle';
            case 'lead_contact': return 'fa-paper-plane';
            case 'conversion': return 'fa-handshake';
            default: return 'fa-info-circle';
        }
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