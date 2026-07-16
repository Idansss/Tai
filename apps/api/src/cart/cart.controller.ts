import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ApiResponse, Cart } from '@tms/contracts';
import type { Request, Response } from 'express';

import { readCookie } from '../auth/auth-cookie.js';
import { AuthService } from '../auth/auth.service.js';
import { AUTH_CONFIG } from '../auth/auth.tokens.js';
import type { AuthConfig } from '../auth/auth.types.js';
import { AddCartLineDto, PromotionCodeDto, UpdateCartLineDto } from './cart.dto.js';
import { CartService, type CartOwner } from './cart.service.js';

const GUEST_COOKIE = 'tms_cart';
/** A guest cart outlives a session deliberately: a browsing customer should not lose it. */
const GUEST_COOKIE_TTL_SECONDS = 30 * 24 * 60 * 60;

@ApiTags('cart')
// Value imports: under emitDecoratorMetadata a type-only import is erased and the
// ValidationPipe silently stops validating the body.
@ApiExtraModels(AddCartLineDto, UpdateCartLineDto, PromotionCodeDto)
@Controller('cart')
export class CartController {
  constructor(
    @Inject(CartService) private readonly cart: CartService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'getCart', summary: 'Read the current cart with fresh totals' })
  @ApiOkResponse({ description: 'The cart, repriced and rechecked against current stock.' })
  async get(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<Cart>> {
    const owner = await this.owner(request, response);
    return this.respond(request, await this.cart.read(owner));
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'addCartItem', summary: 'Add an approved configuration' })
  @ApiOkResponse({ description: 'The updated cart.' })
  async add(
    @Body() body: AddCartLineDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<Cart>> {
    const owner = await this.owner(request, response);
    return this.respond(request, await this.cart.addLine(owner, body));
  }

  @Patch('items/:lineId')
  @ApiOperation({ operationId: 'updateCartItem', summary: 'Change a line quantity' })
  @ApiOkResponse({ description: 'The updated cart.' })
  async update(
    @Param('lineId', new ParseUUIDPipe()) lineId: string,
    @Body() body: UpdateCartLineDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<Cart>> {
    const owner = await this.owner(request, response);
    return this.respond(request, await this.cart.updateLine(owner, lineId, body));
  }

  @Delete('items/:lineId')
  @ApiOperation({ operationId: 'removeCartItem', summary: 'Remove a line' })
  @ApiOkResponse({ description: 'The updated cart.' })
  async remove(
    @Param('lineId', new ParseUUIDPipe()) lineId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<Cart>> {
    const owner = await this.owner(request, response);
    return this.respond(request, await this.cart.removeLine(owner, lineId));
  }

  @Post('promotion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'applyCartPromotion', summary: 'Apply a promotion code' })
  @ApiOkResponse({ description: 'The updated cart.' })
  async applyPromotion(
    @Body() body: PromotionCodeDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<Cart>> {
    const owner = await this.owner(request, response);
    return this.respond(request, await this.cart.applyPromotion(owner, body));
  }

  @Delete('promotion')
  @ApiOperation({ operationId: 'removeCartPromotion', summary: 'Remove the promotion code' })
  @ApiOkResponse({ description: 'The updated cart.' })
  async removePromotion(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<Cart>> {
    const owner = await this.owner(request, response);
    return this.respond(request, await this.cart.removePromotion(owner));
  }

  /**
   * Resolves who this cart belongs to. A cart is deliberately open to anonymous shoppers, so a
   * missing session is normal rather than an error and a guest token is issued on first contact.
   * A signed-in customer keeps their guest token for this request so the two carts can be merged
   * once, after which the cookie is cleared.
   */
  private async owner(request: Request, response: Response): Promise<CartOwner> {
    const sessionToken = readCookie(request.headers.cookie, this.config.cookieName);
    const authenticated = sessionToken ? await this.auth.validateSession(sessionToken) : null;
    const guestToken = readCookie(request.headers.cookie, GUEST_COOKIE);

    if (authenticated) {
      if (guestToken) {
        response.clearCookie(GUEST_COOKIE, { path: '/api/v1' });
      }
      return { userId: authenticated.session.user.id, guestToken };
    }

    const token = guestToken ?? this.cart.newGuestToken();
    if (!guestToken) {
      response.cookie(GUEST_COOKIE, token, {
        httpOnly: true,
        secure: this.config.nodeEnvironment === 'production',
        sameSite: 'lax',
        path: '/api/v1',
        maxAge: GUEST_COOKIE_TTL_SECONDS * 1_000,
      });
    }
    return { guestToken: token };
  }

  private respond<T>(request: Request, data: T): ApiResponse<T> {
    return { data, meta: { correlationId: request.correlationId ?? 'unavailable' } };
  }
}
