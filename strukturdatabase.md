CREATE TABLE "public"."businesses" ( 
  "id" SERIAL,
  "place_id" VARCHAR(255) NULL,
  "name" VARCHAR(500) NOT NULL,
  "phone" VARCHAR(50) NULL,
  "formatted_phone_number" VARCHAR(50) NULL,
  "address" TEXT NULL,
  "website" VARCHAR(500) NULL,
  "rating" NUMERIC NULL DEFAULT 0.0 ,
  "user_ratings_total" INTEGER NULL DEFAULT 0 ,
  "business_status" VARCHAR(50) NULL DEFAULT 'OPERATIONAL'::character varying ,
  "business_types" TEXT NULL,
  "opening_hours" TEXT NULL,
  "search_query" VARCHAR(200) NULL,
  "location" VARCHAR(100) NULL,
  "market_segment" VARCHAR(100) NULL DEFAULT 'general'::character varying ,
  "status" VARCHAR(50) NULL DEFAULT 'new'::character varying ,
  "contact_attempts" INTEGER NULL DEFAULT 0 ,
  "last_contacted" TIMESTAMP NULL,
  "message_sent" BOOLEAN NULL DEFAULT false ,
  "has_phone" BOOLEAN NULL DEFAULT false ,
  "lead_score" INTEGER NULL DEFAULT 0 ,
  "campaign_batch" VARCHAR(100) NULL,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "businesses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "businesses_name_key" UNIQUE ("name")
);
CREATE TABLE "public"."chat_history" ( 
  "id" SERIAL,
  "customer_id" INTEGER NOT NULL,
  "message_type" VARCHAR(10) NOT NULL,
  "content" TEXT NOT NULL,
  "escalated" BOOLEAN NULL DEFAULT false ,
  "message_id" VARCHAR(128) NULL,
  "classification" VARCHAR(50) NULL,
  "ai_confidence" NUMERIC NULL,
  "processing_time_ms" INTEGER NULL,
  "sent_via" VARCHAR(20) NULL,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "chat_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_history_message_id_key" UNIQUE ("message_id")
);
CREATE TABLE "public"."customers" ( 
  "id" SERIAL,
  "phone" VARCHAR(25) NOT NULL,
  "name" VARCHAR(100) NULL,
  "location" VARCHAR(100) NULL,
  "material" VARCHAR(100) NULL,
  "product_type" VARCHAR(100) NULL,
  "status" VARCHAR(20) NULL DEFAULT 'active'::character varying ,
  "has_size_info" BOOLEAN NULL DEFAULT false ,
  "has_image" BOOLEAN NULL DEFAULT false ,
  "conversation_stage" VARCHAR(50) NULL DEFAULT 'greeting'::character varying ,
  "last_classification" VARCHAR(50) NULL,
  "customer_priority" VARCHAR(20) NULL DEFAULT 'normal'::character varying ,
  "last_interaction" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "last_message_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "cooldown_until" TIMESTAMP NULL,
  "message_count_today" INTEGER NULL DEFAULT 0 ,
  "is_cooldown_active" BOOLEAN NULL DEFAULT false ,
  "last_ai_response" TEXT NULL,
  "conversation_quality_score" INTEGER NULL DEFAULT 0 ,
  "total_messages" INTEGER NULL DEFAULT 0 ,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customers_phone_key" UNIQUE ("phone")
);
CREATE TABLE "public"."escalations" ( 
  "id" SERIAL,
  "customer_id" INTEGER NOT NULL,
  "escalation_type" VARCHAR(30) NOT NULL,
  "escalation_reason" TEXT NULL,
  "chat_summary" TEXT NULL,
  "priority_level" VARCHAR(20) NULL DEFAULT 'normal'::character varying ,
  "status" VARCHAR(20) NULL DEFAULT 'open'::character varying ,
  "assigned_to" VARCHAR(100) NULL,
  "response_time_minutes" INTEGER NULL,
  "resolved_at" TIMESTAMP NULL,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "public"."knowledge_ai" ( 
  "id" SERIAL,
  "category" VARCHAR(100) NOT NULL,
  "keywords" ARRAY NULL,
  "question_pattern" TEXT NOT NULL,
  "answer_template" TEXT NOT NULL,
  "context" VARCHAR(200) NULL,
  "priority" INTEGER NULL DEFAULT 50 ,
  "usage_count" INTEGER NULL DEFAULT 0 ,
  "last_used" TIMESTAMP NULL,
  "is_active" BOOLEAN NULL DEFAULT true ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT "knowledge_ai_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_businesses_status" 
ON "public"."businesses" (
  "status" ASC
);
CREATE INDEX "idx_businesses_has_phone" 
ON "public"."businesses" (
  "has_phone" ASC
);
CREATE INDEX "idx_businesses_created_at" 
ON "public"."businesses" (
  "created_at" DESC
);
CREATE INDEX "idx_lead_validation" 
ON "public"."businesses" (
  "status" ASC,
  "has_phone" ASC,
  "contact_attempts" ASC
);
CREATE INDEX "idx_chat_classification" 
ON "public"."chat_history" (
  "classification" ASC
);
CREATE INDEX "idx_chat_created_at" 
ON "public"."chat_history" (
  "created_at" DESC
);
CREATE INDEX "idx_chat_customer_id" 
ON "public"."chat_history" (
  "customer_id" ASC
);
CREATE INDEX "idx_customers_phone" 
ON "public"."customers" (
  "phone" ASC
);
CREATE INDEX "idx_customers_priority" 
ON "public"."customers" (
  "customer_priority" ASC
);
CREATE INDEX "idx_customers_last_message" 
ON "public"."customers" (
  "last_message_at" DESC
);
CREATE INDEX "idx_customers_interaction" 
ON "public"."customers" (
  "last_interaction" ASC
);
CREATE INDEX "idx_customers_classification" 
ON "public"."customers" (
  "last_classification" ASC
);
CREATE INDEX "idx_customers_cooldown" 
ON "public"."customers" (
  "cooldown_until" ASC,
  "is_cooldown_active" ASC
);
CREATE INDEX "idx_customers_active_cooldown" 
ON "public"."customers" (
  "phone" ASC,
  "is_cooldown_active" ASC,
  "cooldown_until" ASC
);
CREATE INDEX "idx_escalations_status" 
ON "public"."escalations" (
  "status" ASC
);
CREATE INDEX "idx_escalations_created" 
ON "public"."escalations" (
  "created_at" DESC
);
CREATE INDEX "idx_escalations_type" 
ON "public"."escalations" (
  "escalation_type" ASC
);
CREATE INDEX "idx_escalations_priority" 
ON "public"."escalations" (
  "priority_level" ASC
);
CREATE INDEX "idx_knowledge_keywords" 
ON "public"."knowledge_ai" (
  "keywords" ASC
);
CREATE INDEX "idx_knowledge_category" 
ON "public"."knowledge_ai" (
  "category" ASC
);
CREATE INDEX "idx_knowledge_priority" 
ON "public"."knowledge_ai" (
  "priority" DESC
);
CREATE INDEX "idx_knowledge_active" 
ON "public"."knowledge_ai" (
  "is_active" ASC
);
ALTER TABLE "public"."chat_history" ADD CONSTRAINT "chat_history_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."escalations" ADD CONSTRAINT "escalations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
CREATE FUNCTION "public"."match_knowledge"(IN user_message TEXT, OUT id INTEGER, OUT category VARCHAR, OUT answer TEXT, OUT priority INTEGER) RETURNS RECORD LANGUAGE PLPGSQL
AS
$$

BEGIN
  RETURN QUERY
  SELECT 
    k.id,
    k.category,
    k.answer_template,
    k.priority
  FROM knowledge_ai k
  WHERE k.is_active = true
    AND k.keywords && string_to_array(lower(user_message), ' ')
  ORDER BY k.priority DESC, k.usage_count DESC
  LIMIT 1;
END;

$$;
CREATE FUNCTION "public"."update_knowledge_usage"() RETURNS TRIGGER LANGUAGE PLPGSQL
AS
$$

BEGIN
  UPDATE knowledge_ai 
  SET usage_count = usage_count + 1,
      last_used = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
  RETURN NEW;
END;

$$;
CREATE VIEW "public"."customer_engagement_stats"
AS
 SELECT c.id,
    c.phone,
    c.name,
    c.status,
    c.customer_priority,
    count(ch.id) AS total_chats,
    max(ch.created_at) AS last_chat_at,
    count(
        CASE
            WHEN (ch.escalated = true) THEN 1
            ELSE NULL::integer
        END) AS escalation_count,
    avg(c.conversation_quality_score) AS avg_quality_score
   FROM (customers c
     LEFT JOIN chat_history ch ON ((c.id = ch.customer_id)))
  GROUP BY c.id;;
CREATE MATERIALIZED VIEW "public"."campaign_performance"
AS
 SELECT campaign_batch,
    count(*) AS total_leads,
    count(
        CASE
            WHEN (message_sent = true) THEN 1
            ELSE NULL::integer
        END) AS contacted,
    count(
        CASE
            WHEN ((status)::text = 'invalid_whatsapp'::text) THEN 1
            ELSE NULL::integer
        END) AS invalid,
    avg(lead_score) AS avg_lead_score,
    max(created_at) AS batch_date
   FROM businesses
  GROUP BY campaign_batch;;
