import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ApiResponse } from '@tms/contracts';
import type { Request } from 'express';

import { AdminSessionGuard } from '../admin-auth/admin-session.guard.js';
import { SessionGuard } from '../auth/session.guard.js';
import { CreateSupportTicketDto, UpsertKnowledgeDto } from './concierge.dto.js';
import { ConciergeService } from './concierge.service.js';

@ApiTags('concierge')
@ApiExtraModels(CreateSupportTicketDto, UpsertKnowledgeDto)
@Controller('concierge')
export class ConciergeController {
  constructor(@Inject(ConciergeService) private readonly concierge: ConciergeService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Create a customer-care support ticket from the Concierge' })
  @ApiOkResponse({ description: 'Ticket created' })
  async createTicket(
    @Body() body: CreateSupportTicketDto,
    @Req() request: Request,
  ): Promise<ApiResponse<unknown>> {
    // Optional session — guests may open tickets with an email.
    const customerUserId = request.authSession?.session.user.id;
    const ticket = await this.concierge.createTicket(body, customerUserId);
    return this.respond(request, ticket);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Persist a Concierge message (server-side analytics)' })
  async appendMessage(
    @Body()
    body: {
      conversationPublicId: string;
      role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
      content: string;
      citationsJson?: unknown;
      intent?: string;
      pagePath?: string;
      latencyMs?: number;
    },
    @Req() request: Request,
  ): Promise<ApiResponse<unknown>> {
    const saved = await this.concierge.appendMessage(body);
    return this.respond(request, { id: saved.id });
  }

  @Get('settings')
  @ApiOperation({ summary: 'Public Concierge settings (no secrets)' })
  async settings(@Req() request: Request): Promise<ApiResponse<unknown>> {
    return this.respond(request, await this.concierge.getSettings());
  }

  @Post('knowledge/sync')
  @ApiOperation({ summary: 'Upsert a knowledge source (secret or admin)' })
  async syncKnowledge(
    @Body() body: UpsertKnowledgeDto,
    @Headers('x-ai-knowledge-sync-secret') secret: string | undefined,
    @Req() request: Request,
  ): Promise<ApiResponse<unknown>> {
    if (!this.concierge.assertKnowledgeSyncSecret(secret) && !request.adminSession) {
      throw new UnauthorizedException('Knowledge sync requires a valid secret or admin session.');
    }
    return this.respond(request, await this.concierge.upsertKnowledge(body));
  }

  @Get('admin/tickets')
  @UseGuards(AdminSessionGuard)
  async adminTickets(
    @Query('status') status: string | undefined,
    @Req() request: Request,
  ): Promise<ApiResponse<unknown>> {
    return this.respond(request, await this.concierge.listTickets(status));
  }

  @Get('admin/conversations')
  @UseGuards(AdminSessionGuard)
  async adminConversations(@Req() request: Request): Promise<ApiResponse<unknown>> {
    return this.respond(request, await this.concierge.listConversations());
  }

  @Get('admin/knowledge')
  @UseGuards(AdminSessionGuard)
  async adminKnowledge(@Req() request: Request): Promise<ApiResponse<unknown>> {
    return this.respond(request, await this.concierge.listKnowledge());
  }

  @Get('admin/metrics')
  @UseGuards(AdminSessionGuard)
  async adminMetrics(@Req() request: Request): Promise<ApiResponse<unknown>> {
    return this.respond(request, await this.concierge.metrics());
  }

  /** Placeholder so SessionGuard import stays meaningful for optional future auth. */
  @Get('me/orders-hint')
  @UseGuards(SessionGuard)
  async ordersHint(@Req() request: Request): Promise<ApiResponse<unknown>> {
    return this.respond(request, {
      message: 'Use GET /api/v1/orders for authoritative order history.',
      userId: request.authSession?.session.user.id,
    });
  }

  private respond<T>(request: Request, data: T): ApiResponse<T> {
    return {
      data,
      meta: { correlationId: request.correlationId ?? 'unavailable' },
    };
  }
}
