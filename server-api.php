<?php
/**
 * CRM Dashboard Server API
 * Handles PostgreSQL database operations and integrations
 * 
 * This file provides a REST API interface for the CRM dashboard
 * to interact with PostgreSQL database and N8N webhooks
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Configuration
class Config {
    public static $database = [
        'host' => 'postgres_scrapdatan8n',
        'port' => 5432,
        'dbname' => 'postgres',
        'user' => 'postgres',
        'password' => 'a0bd3b3c1d54b7833014'
    ];
    
    public static $n8n = [
        'webhook_url' => 'https://projek-n8n-n8n.qk6yxt.easypanel.host/webhook/crm'
    ];
    
    public static $whatsapp = [
        'base_url' => 'https://app.notif.my.id/api/v2',
        'api_key' => 'mm68fx5IvP2GIb2Wjq1760330685167'
    ];
}

// Database Connection Class
class Database {
    private $pdo;
    
    public function __construct() {
        try {
            $dsn = sprintf(
                "pgsql:host=%s;port=%d;dbname=%s",
                Config::$database['host'],
                Config::$database['port'],
                Config::$database['dbname']
            );
            
            $this->pdo = new PDO($dsn, Config::$database['user'], Config::$database['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
    }
    
    public function query($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Query failed: " . $e->getMessage());
            throw new Exception("Query execution failed");
        }
    }
    
    public function execute($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            return $stmt->execute($params);
        } catch (PDOException $e) {
            error_log("Execute failed: " . $e->getMessage());
            throw new Exception("Query execution failed");
        }
    }
}

// API Handler Class
class CRMApi {
    private $db;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $segments = explode('/', trim($path, '/'));
        
        // Remove script name if present
        if (end($segments) === 'server-api.php' || end($segments) === 'api') {
            array_pop($segments);
        }
        
        $endpoint = $segments[0] ?? '';
        $action = $segments[1] ?? '';
        
        try {
            switch ($endpoint) {
                case 'customers':
                    return $this->handleCustomers($action, $method);
                case 'leads':
                    return $this->handleLeads($action, $method);
                case 'escalations':
                    return $this->handleEscalations($action, $method);
                case 'analytics':
                    return $this->handleAnalytics($action, $method);
                case 'chat':
                    return $this->handleChat($action, $method);
                case 'stats':
                    return $this->handleStats($action, $method);
                case 'webhook':
                    return $this->handleWebhook($action, $method);
                case 'health':
                    return $this->healthCheck();
                default:
                    return $this->response(['error' => 'Invalid endpoint'], 404);
            }
        } catch (Exception $e) {
            error_log("API Error: " . $e->getMessage());
            return $this->response(['error' => $e->getMessage()], 500);
        }
    }
    
    // Customer Service Methods
    private function handleCustomers($action, $method) {
        switch ($action) {
            case 'list':
                return $this->getCustomers();
            case 'details':
                $customerId = $_GET['id'] ?? null;
                return $this->getCustomerDetails($customerId);
            case 'history':
                $customerId = $_GET['id'] ?? null;
                return $this->getChatHistory($customerId);
            default:
                return $this->getCustomers();
        }
    }
    
    private function getCustomers() {
        $search = $_GET['search'] ?? '';
        $status = $_GET['status'] ?? '';
        
        $sql = "SELECT 
                    id, phone, name, location, conversation_stage, 
                    last_interaction, is_cooldown_active, cooldown_until,
                    message_count, created_at, updated_at
                FROM customers 
                WHERE 1=1";
        $params = [];
        
        if ($search) {
            $sql .= " AND (name ILIKE ? OR phone ILIKE ?)";
            $searchParam = "%{$search}%";
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        if ($status) {
            if ($status === 'active') {
                $sql .= " AND is_cooldown_active = false";
            } elseif ($status === 'cooldown') {
                $sql .= " AND is_cooldown_active = true";
            } elseif ($status === 'escalated') {
                $sql .= " AND id IN (SELECT DISTINCT customer_id FROM escalations WHERE status = 'open')";
            }
        }
        
        $sql .= " ORDER BY last_interaction DESC LIMIT 100";
        
        $customers = $this->db->query($sql, $params);
        return $this->response(['data' => $customers, 'count' => count($customers)]);
    }
    
    private function getCustomerDetails($customerId) {
        if (!$customerId) {
            return $this->response(['error' => 'Customer ID required'], 400);
        }
        
        $sql = "SELECT 
                    c.*,
                    COUNT(ch.id) as total_messages,
                    MAX(ch.created_at) as last_message_time
                FROM customers c
                LEFT JOIN chat_history ch ON c.id = ch.customer_id
                WHERE c.id = ?
                GROUP BY c.id";
        
        $result = $this->db->query($sql, [$customerId]);
        
        if (empty($result)) {
            return $this->response(['error' => 'Customer not found'], 404);
        }
        
        return $this->response(['data' => $result[0]]);
    }
    
    // Chat and Communication Methods
    private function handleChat($action, $method) {
        switch ($action) {
            case 'recent':
                return $this->getRecentChats();
            case 'history':
                $customerId = $_GET['customer_id'] ?? null;
                return $this->getChatHistory($customerId);
            case 'send':
                if ($method === 'POST') {
                    return $this->sendMessage();
                }
                break;
        }
        return $this->response(['error' => 'Invalid chat action'], 400);
    }
    
    private function getRecentChats() {
        $limit = $_GET['limit'] ?? 10;
        
        $sql = "SELECT 
                    ch.id, ch.customer_id, ch.message_type, ch.content,
                    ch.classification, ch.ai_confidence, ch.created_at,
                    c.name as customer_name, c.phone as customer_phone
                FROM chat_history ch
                LEFT JOIN customers c ON ch.customer_id = c.id
                ORDER BY ch.created_at DESC
                LIMIT ?";
        
        $chats = $this->db->query($sql, [$limit]);
        return $this->response(['data' => $chats]);
    }
    
    private function getChatHistory($customerId) {
        if (!$customerId) {
            return $this->response(['error' => 'Customer ID required'], 400);
        }
        
        $limit = $_GET['limit'] ?? 50;
        
        $sql = "SELECT 
                    id, customer_id, message_type, content,
                    classification, ai_confidence, escalated, created_at
                FROM chat_history 
                WHERE customer_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?";
        
        $history = $this->db->query($sql, [$customerId, $limit]);
        return $this->response(['data' => $history]);
    }
    
    // Escalations Methods
    private function handleEscalations($action, $method) {
        switch ($action) {
            case 'list':
                return $this->getEscalations();
            case 'resolve':
                if ($method === 'POST') {
                    return $this->resolveEscalation();
                }
                break;
        }
        return $this->response(['error' => 'Invalid escalation action'], 400);
    }
    
    private function getEscalations() {
        $status = $_GET['status'] ?? '';
        $priority = $_GET['priority'] ?? '';
        
        $sql = "SELECT 
                    e.id, e.customer_id, e.escalation_type, e.priority,
                    e.status, e.reason, e.created_at, e.resolved_at,
                    c.name as customer_name, c.phone as customer_phone
                FROM escalations e
                LEFT JOIN customers c ON e.customer_id = c.id
                WHERE 1=1";
        $params = [];
        
        if ($status) {
            $sql .= " AND e.status = ?";
            $params[] = $status;
        }
        
        if ($priority) {
            $sql .= " AND e.priority = ?";
            $params[] = $priority;
        }
        
        $sql .= " ORDER BY 
            CASE e.priority 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                ELSE 4 
            END,
            e.created_at DESC";
        
        $escalations = $this->db->query($sql, $params);
        return $this->response(['data' => $escalations]);
    }
    
    // Marketing and Leads Methods
    private function handleLeads($action, $method) {
        switch ($action) {
            case 'list':
                return $this->getLeads();
            case 'contact':
                if ($method === 'POST') {
                    return $this->contactLead();
                }
                break;
            case 'bulk-contact':
                if ($method === 'POST') {
                    return $this->bulkContactLeads();
                }
                break;
            case 'export':
                return $this->exportLeads();
        }
        return $this->response(['error' => 'Invalid leads action'], 400);
    }
    
    private function getLeads() {
        $segment = $_GET['segment'] ?? '';
        $status = $_GET['status'] ?? '';
        $leadScore = $_GET['lead_score'] ?? '';
        
        $sql = "SELECT 
                    id, name, phone, formatted_phone_number, address,
                    website, rating, business_status, market_segment,
                    status, lead_score, contact_attempts, last_contacted,
                    message_sent, has_phone, created_at
                FROM businesses
                WHERE has_phone = true";
        $params = [];
        
        if ($segment) {
            $sql .= " AND market_segment = ?";
            $params[] = $segment;
        }
        
        if ($status) {
            $sql .= " AND status = ?";
            $params[] = $status;
        }
        
        if ($leadScore) {
            if ($leadScore === 'high') {
                $sql .= " AND lead_score >= 70";
            } elseif ($leadScore === 'medium') {
                $sql .= " AND lead_score >= 40 AND lead_score < 70";
            } elseif ($leadScore === 'low') {
                $sql .= " AND lead_score < 40";
            }
        }
        
        $sql .= " ORDER BY lead_score DESC, created_at DESC LIMIT 500";
        
        $leads = $this->db->query($sql, $params);
        return $this->response(['data' => $leads, 'count' => count($leads)]);
    }
    
    // Analytics Methods
    private function handleAnalytics($action, $method) {
        switch ($action) {
            case 'classifications':
                return $this->getMessageClassifications();
            case 'interactions':
                return $this->getInteractionTrends();
            case 'campaign-stats':
                return $this->getCampaignStats();
            default:
                return $this->getAllAnalytics();
        }
    }
    
    private function getMessageClassifications() {
        $dateFilter = $_GET['date_filter'] ?? 'week';
        $dateCondition = '';
        
        if ($dateFilter === 'today') {
            $dateCondition = "WHERE DATE(created_at) = CURRENT_DATE";
        } elseif ($dateFilter === 'week') {
            $dateCondition = "WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'";
        }
        
        $sql = "SELECT 
                    classification,
                    COUNT(*) as count
                FROM chat_history 
                {$dateCondition}
                AND classification IS NOT NULL
                GROUP BY classification
                ORDER BY count DESC";
        
        $results = $this->db->query($sql);
        
        $classifications = [];
        foreach ($results as $row) {
            $classifications[$row['classification']] = (int)$row['count'];
        }
        
        return $this->response(['data' => $classifications]);
    }
    
    private function getInteractionTrends() {
        $days = $_GET['days'] ?? 7;
        
        $sql = "SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as count
                FROM chat_history 
                WHERE created_at >= CURRENT_DATE - INTERVAL '{$days} days'
                GROUP BY DATE(created_at)
                ORDER BY date ASC";
        
        $trends = $this->db->query($sql);
        return $this->response(['data' => $trends]);
    }
    
    private function getCampaignStats() {
        $dateFilter = $_GET['date_filter'] ?? 'today';
        $dateCondition = '';
        
        if ($dateFilter === 'today') {
            $dateCondition = "WHERE DATE(created_at) = CURRENT_DATE";
        } elseif ($dateFilter === 'week') {
            $dateCondition = "WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'";
        } elseif ($dateFilter === 'month') {
            $dateCondition = "WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'";
        }
        
        $queries = [
            "SELECT COUNT(*) as total_sent FROM businesses WHERE message_sent = true {$dateCondition}",
            "SELECT 
                COUNT(CASE WHEN message_sent = true THEN 1 END) as delivered,
                COUNT(CASE WHEN status = 'invalid_whatsapp' THEN 1 END) as failed,
                COUNT(CASE WHEN status = 'contacted' THEN 1 END) as responded
             FROM businesses {$dateCondition}"
        ];
        
        $totalSent = $this->db->query($queries[0])[0]['total_sent'] ?? 0;
        $stats = $this->db->query($queries[1])[0] ?? [];
        
        return $this->response([
            'data' => [
                'totalSent' => (int)$totalSent,
                'totalDelivered' => (int)($stats['delivered'] ?? 0),
                'totalFailed' => (int)($stats['failed'] ?? 0),
                'responseCount' => (int)($stats['responded'] ?? 0)
            ]
        ]);
    }
    
    // Statistics Methods
    private function handleStats($action, $method) {
        switch ($action) {
            case 'quick':
                return $this->getQuickStats();
            case 'activities':
                return $this->getRecentActivities();
            default:
                return $this->getQuickStats();
        }
    }
    
    private function getQuickStats() {
        $queries = [
            "SELECT COUNT(*) as total FROM customers",
            "SELECT COUNT(*) as total FROM businesses WHERE has_phone = true",
            "SELECT COUNT(*) as total FROM escalations WHERE status = 'open'"
        ];
        
        $customerCount = $this->db->query($queries[0])[0]['total'] ?? 0;
        $leadCount = $this->db->query($queries[1])[0]['total'] ?? 0;
        $escalationCount = $this->db->query($queries[2])[0]['total'] ?? 0;
        
        // Calculate response rate
        $responseQuery = "SELECT 
            COUNT(CASE WHEN message_sent = true AND status = 'contacted' THEN 1 END) as responded,
            COUNT(CASE WHEN message_sent = true THEN 1 END) as total_sent
            FROM businesses";
        $responseStats = $this->db->query($responseQuery)[0] ?? [];
        
        $responseRate = $responseStats['total_sent'] > 0 
            ? round(($responseStats['responded'] / $responseStats['total_sent']) * 100)
            : 0;
        
        return $this->response([
            'data' => [
                'totalCustomers' => (int)$customerCount,
                'totalLeads' => (int)$leadCount,
                'totalEscalations' => (int)$escalationCount,
                'responseRate' => (int)$responseRate
            ]
        ]);
    }
    
    private function getRecentActivities() {
        $limit = $_GET['limit'] ?? 20;
        
        $sql = "(SELECT 
                    'escalation' as type,
                    'Escalation baru: ' || reason as description,
                    created_at as timestamp,
                    (SELECT name FROM customers WHERE id = customer_id) as customer
                FROM escalations 
                WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours'
                ORDER BY created_at DESC
                LIMIT 10)
                UNION ALL
                (SELECT 
                    'lead_contact' as type,
                    'Lead baru dikontak: ' || name as description,
                    last_contacted as timestamp,
                    name as customer
                FROM businesses 
                WHERE last_contacted >= CURRENT_DATE - INTERVAL '24 hours'
                AND message_sent = true
                ORDER BY last_contacted DESC
                LIMIT 10)
                ORDER BY timestamp DESC
                LIMIT ?";
        
        $activities = $this->db->query($sql, [$limit]);
        return $this->response(['data' => $activities]);
    }
    
    // Webhook and Integration Methods
    private function handleWebhook($action, $method) {
        if ($method !== 'POST') {
            return $this->response(['error' => 'POST method required'], 405);
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        switch ($action) {
            case 'trigger':
                return $this->triggerN8NWebhook($input);
            case 'whatsapp':
                return $this->sendWhatsAppMessage($input);
            default:
                return $this->response(['error' => 'Invalid webhook action'], 400);
        }
    }
    
    private function triggerN8NWebhook($data) {
        $webhookUrl = Config::$n8n['webhook_url'];
        
        $payload = [
            'source' => 'crm_dashboard',
            'timestamp' => date('c'),
        ];
        
        if ($data) {
            $payload = array_merge($payload, $data);
        }
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $webhookUrl,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 200 && $httpCode < 300) {
            return $this->response(['success' => true, 'response' => $response]);
        } else {
            return $this->response(['error' => 'Webhook failed', 'http_code' => $httpCode], 500);
        }
    }
    
    private function sendWhatsAppMessage($data) {
        $phone = $data['phone'] ?? '';
        $message = $data['message'] ?? '';
        
        if (!$phone || !$message) {
            return $this->response(['error' => 'Phone and message required'], 400);
        }
        
        $url = Config::$whatsapp['base_url'] . '/send-message';
        $params = [
            'apikey' => Config::$whatsapp['api_key'],
            'mtype' => 'text',
            'receiver' => $phone,
            'text' => $message
        ];
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url . '?' . http_build_query($params),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 200 && $httpCode < 300) {
            return $this->response(['success' => true, 'response' => json_decode($response, true)]);
        } else {
            return $this->response(['error' => 'WhatsApp API failed', 'http_code' => $httpCode], 500);
        }
    }
    
    // Health Check
    private function healthCheck() {
        try {
            $result = $this->db->query('SELECT 1 as status');
            return $this->response([
                'status' => 'healthy',
                'database' => !empty($result),
                'timestamp' => date('c')
            ]);
        } catch (Exception $e) {
            return $this->response([
                'status' => 'unhealthy',
                'database' => false,
                'error' => $e->getMessage(),
                'timestamp' => date('c')
            ], 500);
        }
    }
    
    // Utility Methods
    private function response($data, $statusCode = 200) {
        http_response_code($statusCode);
        return json_encode($data, JSON_UNESCAPED_UNICODE);
    }
}

// Initialize and handle request
try {
    $api = new CRMApi();
    echo $api->handleRequest();
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
?>