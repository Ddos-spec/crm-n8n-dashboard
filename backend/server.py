from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import datetime, timedelta
import httpx
import os
import io
import csv
from dotenv import load_dotenv
from database import get_db_connection, test_connection

load_dotenv()

app = FastAPI(title="CRM API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Test database connection on startup"""
    if test_connection():
        print("✅ Database connected successfully")
    else:
        print("❌ Database connection failed")

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "database": test_connection()}

# ==================== DASHBOARD STATISTICS ====================
@app.get("/api/stats")
async def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Total customers
                cur.execute("SELECT COUNT(*) as total FROM customers")
                total_customers = cur.fetchone()['total']
                
                # Total leads (businesses with phone)
                cur.execute("SELECT COUNT(*) as total FROM businesses WHERE has_phone = true")
                total_leads = cur.fetchone()['total']
                
                # Total escalations
                cur.execute("SELECT COUNT(*) as total FROM escalations WHERE status = 'open'")
                open_escalations = cur.fetchone()['total']
                
                # Today's chats
                cur.execute("""
                    SELECT COUNT(*) as total FROM chat_history 
                    WHERE DATE(created_at) = CURRENT_DATE
                """)
                today_chats = cur.fetchone()['total']
                
                # Recent activities
                cur.execute("""
                    SELECT 
                        'chat' as type,
                        c.name as customer_name,
                        c.phone as customer_phone,
                        ch.content as description,
                        ch.created_at as timestamp
                    FROM chat_history ch
                    LEFT JOIN customers c ON ch.customer_id = c.id
                    WHERE ch.created_at >= NOW() - INTERVAL '24 hours'
                    ORDER BY ch.created_at DESC
                    LIMIT 10
                """)
                recent_activities = cur.fetchall()
                
                return {
                    "success": True,
                    "data": {
                        "total_customers": total_customers,
                        "total_leads": total_leads,
                        "open_escalations": open_escalations,
                        "today_chats": today_chats,
                        "recent_activities": recent_activities
                    }
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== CUSTOMERS ====================
@app.get("/api/customers")
async def get_customers(
    search: Optional[str] = None,
    priority: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0
):
    """Get customers with filters"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                query = """
                    SELECT 
                        id, phone, name, location, conversation_stage,
                        last_interaction, is_cooldown_active, message_count_today,
                        customer_priority, created_at, total_messages
                    FROM customers
                    WHERE 1=1
                """
                params = []
                
                if search:
                    query += " AND (name ILIKE %s OR phone ILIKE %s)"
                    params.extend([f"%{search}%", f"%{search}%"])
                
                if priority:
                    query += " AND customer_priority = %s"
                    params.append(priority)
                
                if date_from:
                    query += " AND DATE(created_at) >= %s"
                    params.append(date_from)
                
                if date_to:
                    query += " AND DATE(created_at) <= %s"
                    params.append(date_to)
                
                query += " ORDER BY last_interaction DESC LIMIT %s OFFSET %s"
                params.extend([limit, offset])
                
                cur.execute(query, params)
                customers = cur.fetchall()
                
                # Get total count
                count_query = "SELECT COUNT(*) as total FROM customers WHERE 1=1"
                count_params = []
                if search:
                    count_query += " AND (name ILIKE %s OR phone ILIKE %s)"
                    count_params.extend([f"%{search}%", f"%{search}%"])
                if priority:
                    count_query += " AND customer_priority = %s"
                    count_params.append(priority)
                if date_from:
                    count_query += " AND DATE(created_at) >= %s"
                    count_params.append(date_from)
                if date_to:
                    count_query += " AND DATE(created_at) <= %s"
                    count_params.append(date_to)
                
                cur.execute(count_query, count_params)
                total = cur.fetchone()['total']
                
                return {
                    "success": True,
                    "data": customers,
                    "total": total,
                    "limit": limit,
                    "offset": offset
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/customers/{customer_id}")
async def get_customer_detail(customer_id: int):
    """Get customer detail"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM customers WHERE id = %s
                """, (customer_id,))
                customer = cur.fetchone()
                
                if not customer:
                    raise HTTPException(status_code=404, detail="Customer not found")
                
                return {"success": True, "data": customer}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== CHAT HISTORY ====================
@app.get("/api/chat-history/{customer_id}")
async def get_chat_history(customer_id: int, limit: int = 50):
    """Get chat history for a customer"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get customer info
                cur.execute("""
                    SELECT id, phone, name FROM customers WHERE id = %s
                """, (customer_id,))
                customer = cur.fetchone()
                
                if not customer:
                    raise HTTPException(status_code=404, detail="Customer not found")
                
                # Get chat history
                cur.execute("""
                    SELECT 
                        id, message_type, content, escalated,
                        classification, created_at
                    FROM chat_history
                    WHERE customer_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                """, (customer_id, limit))
                chats = cur.fetchall()
                
                return {
                    "success": True,
                    "customer": customer,
                    "chats": chats
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/send-whatsapp")
async def send_whatsapp(data: dict):
    """Send WhatsApp message"""
    try:
        phone = data.get('phone')
        message = data.get('message')
        customer_id = data.get('customer_id')
        
        if not phone or not message:
            raise HTTPException(status_code=400, detail="Phone and message required")
        
        # Format phone number for WhatsApp
        if not phone.endswith('@s.whatsapp.net'):
            phone = f"{phone}@s.whatsapp.net"
        
        # Send via WhatsApp API
        whatsapp_url = os.getenv('WHATSAPP_API_URL')
        api_key = os.getenv('WHATSAPP_API_KEY')
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                whatsapp_url,
                params={
                    'apikey': api_key,
                    'mtype': 'text',
                    'receiver': phone,
                    'text': message
                },
                timeout=30.0
            )
            
            # Save to chat history if customer_id provided
            if customer_id:
                with get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO chat_history 
                            (customer_id, message_type, content, sent_via, created_at)
                            VALUES (%s, %s, %s, %s, NOW())
                        """, (customer_id, 'outgoing', message, 'api'))
                        conn.commit()
            
            return {
                "success": True,
                "message": "Pesan berhasil dikirim",
                "whatsapp_response": response.json() if response.status_code == 200 else None
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== BUSINESSES/LEADS ====================
@app.get("/api/businesses")
async def get_businesses(
    search: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0
):
    """Get businesses/leads with filters"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                query = """
                    SELECT 
                        id, name, phone, formatted_phone_number, address,
                        market_segment, lead_score, status, rating,
                        user_ratings_total, contact_attempts, last_contacted,
                        message_sent, created_at
                    FROM businesses
                    WHERE has_phone = true
                """
                params = []
                
                if search:
                    query += " AND (name ILIKE %s OR phone ILIKE %s OR address ILIKE %s)"
                    params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
                
                if status:
                    query += " AND status = %s"
                    params.append(status)
                
                if date_from:
                    query += " AND DATE(created_at) >= %s"
                    params.append(date_from)
                
                if date_to:
                    query += " AND DATE(created_at) <= %s"
                    params.append(date_to)
                
                query += " ORDER BY lead_score DESC, created_at DESC LIMIT %s OFFSET %s"
                params.extend([limit, offset])
                
                cur.execute(query, params)
                businesses = cur.fetchall()
                
                # Get total count
                count_query = "SELECT COUNT(*) as total FROM businesses WHERE has_phone = true"
                count_params = []
                if search:
                    count_query += " AND (name ILIKE %s OR phone ILIKE %s OR address ILIKE %s)"
                    count_params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
                if status:
                    count_query += " AND status = %s"
                    count_params.append(status)
                if date_from:
                    count_query += " AND DATE(created_at) >= %s"
                    count_params.append(date_from)
                if date_to:
                    count_query += " AND DATE(created_at) <= %s"
                    count_params.append(date_to)
                
                cur.execute(count_query, count_params)
                total = cur.fetchone()['total']
                
                return {
                    "success": True,
                    "data": businesses,
                    "total": total,
                    "limit": limit,
                    "offset": offset
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== ESCALATIONS ====================
@app.get("/api/escalations")
async def get_escalations(
    status_filter: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = Query(100, le=500)
):
    """Get escalations with filters"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                query = """
                    SELECT 
                        e.id, e.escalation_type, e.priority_level, e.status,
                        e.escalation_reason, e.created_at,
                        c.name as customer_name, c.phone as customer_phone
                    FROM escalations e
                    LEFT JOIN customers c ON e.customer_id = c.id
                    WHERE 1=1
                """
                params = []
                
                if status_filter:
                    query += " AND e.status = %s"
                    params.append(status_filter)
                
                if priority:
                    query += " AND e.priority_level = %s"
                    params.append(priority)
                
                query += """
                    ORDER BY 
                        CASE e.priority_level 
                            WHEN 'urgent' THEN 1 
                            WHEN 'high' THEN 2 
                            ELSE 3 
                        END,
                        e.created_at DESC
                    LIMIT %s
                """
                params.append(limit)
                
                cur.execute(query, params)
                escalations = cur.fetchall()
                
                return {"success": True, "data": escalations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/escalations/{escalation_id}/resolve")
async def resolve_escalation(escalation_id: int, data: dict):
    """Resolve an escalation"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE escalations
                    SET status = 'resolved',
                        resolved_at = NOW(),
                        response_time_minutes = EXTRACT(EPOCH FROM (NOW() - created_at))/60
                    WHERE id = %s
                    RETURNING *
                """, (escalation_id,))
                
                escalation = cur.fetchone()
                conn.commit()
                
                if not escalation:
                    raise HTTPException(status_code=404, detail="Escalation not found")
                
                return {
                    "success": True,
                    "message": "Eskalasi berhasil diselesaikan",
                    "data": escalation
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== EXPORT TO CSV ====================
@app.get("/api/export/customers")
async def export_customers_csv():
    """Export customers to CSV"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        id, phone, name, location, conversation_stage,
                        customer_priority, message_count_today, total_messages,
                        created_at, last_interaction
                    FROM customers
                    ORDER BY created_at DESC
                """)
                customers = cur.fetchall()
                
                # Create CSV
                output = io.StringIO()
                if customers:
                    writer = csv.DictWriter(output, fieldnames=customers[0].keys())
                    writer.writeheader()
                    writer.writerows(customers)
                
                output.seek(0)
                return StreamingResponse(
                    iter([output.getvalue()]),
                    media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=customers.csv"}
                )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/export/businesses")
async def export_businesses_csv():
    """Export businesses to CSV"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        id, name, phone, address, market_segment, lead_score,
                        status, rating, contact_attempts, message_sent, created_at
                    FROM businesses
                    WHERE has_phone = true
                    ORDER BY created_at DESC
                """)
                businesses = cur.fetchall()
                
                # Create CSV
                output = io.StringIO()
                if businesses:
                    writer = csv.DictWriter(output, fieldnames=businesses[0].keys())
                    writer.writeheader()
                    writer.writerows(businesses)
                
                output.seek(0)
                return StreamingResponse(
                    iter([output.getvalue()]),
                    media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=leads.csv"}
                )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/export/chat-history")
async def export_chat_history_csv():
    """Export chat history to CSV"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        ch.id, c.name as customer_name, c.phone as customer_phone,
                        ch.message_type, ch.content, ch.classification, ch.created_at
                    FROM chat_history ch
                    LEFT JOIN customers c ON ch.customer_id = c.id
                    ORDER BY ch.created_at DESC
                """)
                chats = cur.fetchall()
                
                # Create CSV
                output = io.StringIO()
                if chats:
                    writer = csv.DictWriter(output, fieldnames=chats[0].keys())
                    writer.writeheader()
                    writer.writerows(chats)
                
                output.seek(0)
                return StreamingResponse(
                    iter([output.getvalue()]),
                    media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=chat_history.csv"}
                )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)