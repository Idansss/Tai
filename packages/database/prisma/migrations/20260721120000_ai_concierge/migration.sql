-- F.A.T.U Concierge: conversations, knowledge, support tickets, analytics
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');
CREATE TYPE "AiConversationStatus" AS ENUM ('OPEN', 'WAITING_HUMAN', 'RESOLVED', 'ARCHIVED');
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');
CREATE TYPE "AiKnowledgeVisibility" AS ENUM ('PUBLIC', 'AUTHENTICATED', 'ADMIN');
CREATE TYPE "AiKnowledgeSourceType" AS ENUM ('PRODUCT', 'ARTWORK', 'COLLECTION', 'POLICY', 'STORY', 'FAQ', 'PAGE', 'ARTICLE');

CREATE TABLE "ai_conversations" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(64) NOT NULL,
    "customer_user_id" UUID,
    "guest_session_key" VARCHAR(128),
    "status" "AiConversationStatus" NOT NULL DEFAULT 'OPEN',
    "intent" VARCHAR(64),
    "page_path" VARCHAR(512),
    "feedback_score" INTEGER,
    "feedback_note" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_conversations_public_id_key" ON "ai_conversations"("public_id");
CREATE INDEX "ai_conversations_customer_created_idx" ON "ai_conversations"("customer_user_id", "created_at");
CREATE INDEX "ai_conversations_status_updated_idx" ON "ai_conversations"("status", "updated_at");
CREATE INDEX "ai_conversations_intent_created_idx" ON "ai_conversations"("intent", "created_at");

CREATE TABLE "ai_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations_json" JSONB,
    "tool_name" VARCHAR(100),
    "token_count" INTEGER,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_messages_conversation_created_idx" ON "ai_messages"("conversation_id", "created_at");

CREATE TABLE "ai_knowledge_sources" (
    "id" UUID NOT NULL,
    "source_type" "AiKnowledgeSourceType" NOT NULL,
    "source_id" VARCHAR(200) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "canonical_url" VARCHAR(500) NOT NULL,
    "locale" VARCHAR(16) NOT NULL DEFAULT 'en-NG',
    "visibility" "AiKnowledgeVisibility" NOT NULL DEFAULT 'PUBLIC',
    "version" VARCHAR(64) NOT NULL,
    "checksum" VARCHAR(128) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMPTZ(3),
    "sync_error" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_knowledge_sources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_knowledge_sources_type_id_locale_uid" ON "ai_knowledge_sources"("source_type", "source_id", "locale");
CREATE INDEX "ai_knowledge_sources_published_priority_idx" ON "ai_knowledge_sources"("published", "priority");

CREATE TABLE "ai_knowledge_chunks" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "token_hint" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_knowledge_chunks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_knowledge_chunks_source_idx" ON "ai_knowledge_chunks"("source_id");

CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(32) NOT NULL,
    "customer_user_id" UUID,
    "guest_email" VARCHAR(320),
    "conversation_id" UUID,
    "order_id" UUID,
    "order_reference" VARCHAR(64),
    "category" VARCHAR(64) NOT NULL,
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
    "summary" VARCHAR(500) NOT NULL,
    "customer_message" TEXT NOT NULL,
    "ai_context_summary" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "support_tickets_reference_key" ON "support_tickets"("reference");
CREATE INDEX "support_tickets_queue_idx" ON "support_tickets"("status", "priority", "created_at");
CREATE INDEX "support_tickets_customer_created_idx" ON "support_tickets"("customer_user_id", "created_at");
CREATE INDEX "support_tickets_order_reference_idx" ON "support_tickets"("order_reference");

CREATE TABLE "ai_analytics_events" (
    "id" UUID NOT NULL,
    "conversation_id" UUID,
    "event_type" VARCHAR(64) NOT NULL,
    "intent" VARCHAR(64),
    "attribution" VARCHAR(32),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_analytics_events_type_created_idx" ON "ai_analytics_events"("event_type", "created_at");
CREATE INDEX "ai_analytics_events_conversation_idx" ON "ai_analytics_events"("conversation_id");

CREATE TABLE "ai_concierge_settings" (
    "id" UUID NOT NULL,
    "assistant_name" VARCHAR(100) NOT NULL DEFAULT 'F.A.T.U Concierge',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "support_email" VARCHAR(320),
    "business_hours_json" JSONB,
    "retention_days" INTEGER NOT NULL DEFAULT 90,
    "escalation_note" VARCHAR(1000),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_concierge_settings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_knowledge_chunks" ADD CONSTRAINT "ai_knowledge_chunks_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "ai_knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_analytics_events" ADD CONSTRAINT "ai_analytics_events_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
