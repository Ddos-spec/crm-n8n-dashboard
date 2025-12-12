-- CreateTable
CREATE TABLE "businesses" (
    "id" SERIAL NOT NULL,
    "place_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "rating" DOUBLE PRECISION,
    "lead_score" INTEGER NOT NULL DEFAULT 0,
    "campaign_batch" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "contact_attempts" INTEGER NOT NULL DEFAULT 0,
    "message_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "conversation_stage" TEXT NOT NULL DEFAULT 'greeting',
    "cooldown_until" TIMESTAMP(3),
    "message_count_today" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_history" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "message_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "classification" TEXT,
    "ai_confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalations" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "escalation_type" TEXT NOT NULL,
    "priority_level" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "assigned_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_ai" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "keywords" TEXT[],
    "question_pattern" TEXT,
    "answer_template" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_ai_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "businesses_place_id_key" ON "businesses"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- AddForeignKey
ALTER TABLE "chat_history" ADD CONSTRAINT "chat_history_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Materialized View: customer_engagement_stats
CREATE MATERIALIZED VIEW IF NOT EXISTS customer_engagement_stats AS
SELECT
    c.id as customer_id,
    c.phone,
    c.name,
    COUNT(ch.id) as total_chats,
    MAX(ch.created_at) as last_chat_at,
    COUNT(CASE WHEN ch.escalated = true THEN 1 END) as escalation_count,
    -- Simple avg quality score placeholder
    AVG(CASE WHEN ch.ai_confidence IS NOT NULL THEN ch.ai_confidence * 100 ELSE 50 END) as avg_quality_score
FROM customers c
LEFT JOIN chat_history ch ON c.id = ch.customer_id
GROUP BY c.id;

-- Materialized View: campaign_performance
CREATE MATERIALIZED VIEW IF NOT EXISTS campaign_performance AS
SELECT
    campaign_batch,
    COUNT(*) as total_leads,
    COUNT(CASE WHEN message_sent = true THEN 1 END) as contacted,
    COUNT(CASE WHEN status = 'invalid_whatsapp' THEN 1 END) as invalid,
    AVG(lead_score) as avg_lead_score,
    DATE(created_at) as batch_date
FROM businesses
WHERE campaign_batch IS NOT NULL
GROUP BY campaign_batch, DATE(created_at);

-- Function: match_knowledge
CREATE OR REPLACE FUNCTION match_knowledge(search_query TEXT)
RETURNS TABLE (
    id INT,
    answer_template TEXT,
    priority INT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        k.id,
        k.answer_template,
        k.priority,
        0.0::FLOAT as similarity
    FROM knowledge_ai k
    WHERE
        EXISTS (
            SELECT 1
            FROM unnest(k.keywords) kw
            WHERE search_query ILIKE '%' || kw || '%'
        )
    ORDER BY k.priority DESC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- Function: update_knowledge_usage
CREATE OR REPLACE FUNCTION update_knowledge_usage(kid INT)
RETURNS VOID AS $$
BEGIN
    UPDATE knowledge_ai
    SET usage_count = usage_count + 1,
        last_used = NOW()
    WHERE id = kid;
END;
$$ LANGUAGE plpgsql;
