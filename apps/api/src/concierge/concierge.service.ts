import { createHash, randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { loadEnvironment } from '@tms/configuration';

import { DatabaseService } from '../database/database.service.js';
import type { CreateSupportTicketDto, UpsertKnowledgeDto } from './concierge.dto.js';

function ticketReference(): string {
  return `ST-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function checksum(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 24);
}

const SOURCE_TYPE_MAP = {
  product: 'PRODUCT',
  artwork: 'ARTWORK',
  collection: 'COLLECTION',
  policy: 'POLICY',
  story: 'STORY',
  faq: 'FAQ',
  page: 'PAGE',
  article: 'ARTICLE',
} as const;

@Injectable()
export class ConciergeService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async createTicket(input: CreateSupportTicketDto, customerUserId?: string) {
    let conversationId: string | undefined;
    if (input.conversationPublicId) {
      const conversation = await this.database.client.aiConversation.findUnique({
        where: { publicId: input.conversationPublicId },
        select: { id: true },
      });
      conversationId = conversation?.id;
    }

    const ticket = await this.database.client.supportTicket.create({
      data: {
        id: crypto.randomUUID(),
        reference: ticketReference(),
        customerUserId: customerUserId ?? null,
        guestEmail: input.guestEmail ?? null,
        conversationId: conversationId ?? null,
        orderReference: input.orderReference ?? null,
        category: input.category,
        priority: input.priority ?? 'NORMAL',
        summary: input.summary,
        customerMessage: input.customerMessage,
        aiContextSummary: input.aiContextSummary,
        status: 'OPEN',
      },
    });

    await this.database.client.aiAnalyticsEvent.create({
      data: {
        id: crypto.randomUUID(),
        conversationId: conversationId ?? null,
        eventType: 'support_ticket_created',
        metadata: { reference: ticket.reference, category: ticket.category },
      },
    });

    return {
      id: ticket.id,
      reference: ticket.reference,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      createdAt: ticket.createdAt.toISOString(),
    };
  }

  async listTickets(status?: string) {
    const tickets = await this.database.client.supportTicket.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    return tickets.map((t) => ({
      id: t.id,
      reference: t.reference,
      category: t.category,
      priority: t.priority,
      status: t.status,
      summary: t.summary,
      orderReference: t.orderReference,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  async listConversations() {
    const rows = await this.database.client.aiConversation.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: { _count: { select: { messages: true } } },
    });
    return rows.map((c) => ({
      id: c.id,
      publicId: c.publicId,
      status: c.status,
      intent: c.intent,
      pagePath: c.pagePath,
      feedbackScore: c.feedbackScore,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      messageCount: c._count.messages,
    }));
  }

  async ensureConversation(publicId: string, pagePath?: string) {
    return this.database.client.aiConversation.upsert({
      where: { publicId },
      create: {
        id: crypto.randomUUID(),
        publicId,
        pagePath: pagePath ?? null,
        status: 'OPEN',
      },
      update: { pagePath: pagePath ?? undefined },
    });
  }

  async appendMessage(input: {
    conversationPublicId: string;
    role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
    content: string;
    citationsJson?: unknown;
    toolName?: string;
    latencyMs?: number;
    intent?: string;
    pagePath?: string;
  }) {
    const conversation = await this.ensureConversation(input.conversationPublicId, input.pagePath);
    if (input.intent) {
      await this.database.client.aiConversation.update({
        where: { id: conversation.id },
        data: { intent: input.intent },
      });
    }
    return this.database.client.aiMessage.create({
      data: {
        id: crypto.randomUUID(),
        conversationId: conversation.id,
        role: input.role,
        content: input.content,
        citationsJson: input.citationsJson as never,
        toolName: input.toolName ?? null,
        latencyMs: input.latencyMs ?? null,
      },
    });
  }

  async upsertKnowledge(input: UpsertKnowledgeDto) {
    const sourceTypeKey = input.sourceType.toLowerCase() as keyof typeof SOURCE_TYPE_MAP;
    const sourceType = SOURCE_TYPE_MAP[sourceTypeKey];
    if (!sourceType) {
      throw Object.assign(new Error('Invalid sourceType'), { status: 400 });
    }
    const locale = input.locale ?? 'en-NG';
    const sum = checksum(input.content);
    const source = await this.database.client.aiKnowledgeSource.upsert({
      where: {
        sourceType_sourceId_locale: {
          sourceType,
          sourceId: input.sourceId,
          locale,
        },
      },
      create: {
        id: crypto.randomUUID(),
        sourceType,
        sourceId: input.sourceId,
        title: input.title,
        canonicalUrl: input.canonicalUrl,
        locale,
        version: sum,
        checksum: sum,
        priority: input.priority ?? 0,
        published: true,
        lastSyncedAt: new Date(),
        chunks: {
          create: [
            {
              id: crypto.randomUUID(),
              content: input.content,
              tokenHint: Math.ceil(input.content.length / 4),
            },
          ],
        },
      },
      update: {
        title: input.title,
        canonicalUrl: input.canonicalUrl,
        version: sum,
        checksum: sum,
        priority: input.priority ?? 0,
        published: true,
        lastSyncedAt: new Date(),
        syncError: null,
        chunks: {
          deleteMany: {},
          create: [
            {
              id: crypto.randomUUID(),
              content: input.content,
              tokenHint: Math.ceil(input.content.length / 4),
            },
          ],
        },
      },
    });
    return {
      id: source.id,
      sourceId: source.sourceId,
      checksum: source.checksum,
      lastSyncedAt: source.lastSyncedAt?.toISOString() ?? null,
    };
  }

  async listKnowledge() {
    const sources = await this.database.client.aiKnowledgeSource.findMany({
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      take: 200,
      include: { _count: { select: { chunks: true } } },
    });
    return sources.map((s) => ({
      id: s.id,
      sourceType: s.sourceType,
      sourceId: s.sourceId,
      title: s.title,
      canonicalUrl: s.canonicalUrl,
      priority: s.priority,
      published: s.published,
      checksum: s.checksum,
      lastSyncedAt: s.lastSyncedAt?.toISOString() ?? null,
      syncError: s.syncError,
      chunkCount: s._count.chunks,
    }));
  }

  async metrics() {
    const [conversations, tickets, events] = await Promise.all([
      this.database.client.aiConversation.count(),
      this.database.client.supportTicket.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.database.client.aiAnalyticsEvent.groupBy({
        by: ['eventType'],
        _count: true,
      }),
    ]);
    return {
      totalConversations: conversations,
      ticketsByStatus: Object.fromEntries(tickets.map((t) => [t.status, t._count])),
      eventsByType: Object.fromEntries(events.map((e) => [e.eventType, e._count])),
      retentionDays: loadEnvironment().AI_CHAT_RETENTION_DAYS,
      assistantName: loadEnvironment().AI_ASSISTANT_NAME,
    };
  }

  async getSettings() {
    const env = loadEnvironment();
    const existing = await this.database.client.aiConciergeSettings.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      return {
        assistantName: existing.assistantName,
        enabled: existing.enabled,
        supportEmail: existing.supportEmail,
        retentionDays: existing.retentionDays,
        escalationNote: existing.escalationNote,
      };
    }
    return {
      assistantName: env.AI_ASSISTANT_NAME,
      enabled: env.AI_ENABLED,
      supportEmail: env.AI_SUPPORT_EMAIL ?? null,
      retentionDays: env.AI_CHAT_RETENTION_DAYS,
      escalationNote: null,
    };
  }

  assertKnowledgeSyncSecret(header: string | undefined): boolean {
    const secret = loadEnvironment().AI_KNOWLEDGE_SYNC_SECRET;
    if (!secret) return process.env.NODE_ENV !== 'production';
    return Boolean(header && header === secret);
  }
}
