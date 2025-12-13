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
  "customer_priority" VARCHAR(20) NULL DEFAULT 'normal'::character varying ,
  "last_interaction" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "created_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "updated_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "last_message_at" TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ,
  "total_messages" INTEGER NULL DEFAULT 0 ,
  "company" VARCHAR(100) NULL,
  "thickness" VARCHAR(20) NULL,
  "size" VARCHAR(100) NULL,
  "is_owner" BOOLEAN NULL DEFAULT false ,
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
  "expired_at" TIMESTAMP NULL,
  "snapshot_data" JSONB NULL,
  CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "idx_businesses_campaign_lookup" 
ON "public"."businesses" (
  "status" ASC,
  "has_phone" ASC,
  "lead_score" DESC
);
CREATE INDEX "idx_chat_classification" 
ON "public"."chat_history" (
  "classification" ASC
);
CREATE INDEX "idx_chat_customer_id" 
ON "public"."chat_history" (
  "customer_id" ASC
);
CREATE INDEX "idx_chat_created_at" 
ON "public"."chat_history" (
  "created_at" DESC
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
CREATE INDEX "idx_customers_escalation_lookup" 
ON "public"."customers" (
  "phone" ASC,
  "status" ASC,
  "last_interaction" ASC
);
CREATE INDEX "idx_customers_name" 
ON "public"."customers" (
  "name" ASC
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
CREATE INDEX "idx_escalations_cooldown" 
ON "public"."escalations" (
  "customer_id" ASC,
  "status" ASC,
  "expired_at" ASC
);
CREATE INDEX "idx_escalations_snapshot" 
ON "public"."escalations" (
  "snapshot_data" ASC
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
        END) AS escalation_count
   FROM (customers c
     LEFT JOIN chat_history ch ON ((c.id = ch.customer_id)))
  GROUP BY c.id;;
