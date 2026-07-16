import { z } from 'zod';

export const apiVersion = 'v1' as const;

export const errorCodes = [
  'VALIDATION_FAILED',
  'AUTHENTICATION_REQUIRED',
  'AUTHENTICATION_INVALID',
  'EMAIL_VERIFICATION_REQUIRED',
  'TOKEN_INVALID_OR_EXPIRED',
  'SESSION_INVALID',
  'PERMISSION_DENIED',
  'RESOURCE_NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'IDEMPOTENCY_CONFLICT',
  'INVENTORY_UNAVAILABLE',
  'INTEGRATION_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;

export const ErrorCodeSchema = z.enum(errorCodes);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const OrderStatusSchema = z.enum([
  'DRAFT',
  'AWAITING_PAYMENT',
  'PAYMENT_PROCESSING',
  'PAID',
  'PRODUCTION_QUEUED',
  'PRINTING',
  'QUALITY_CHECK',
  'READY_FOR_DISPATCH',
  'SHIPMENT_BOOKED',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'PAYMENT_FAILED',
  'PAYMENT_CANCELLED',
  'CANCEL_REQUESTED',
  'CANCELLED',
  'REFUND_PENDING',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'DELIVERY_EXCEPTION',
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'RETURN_IN_TRANSIT',
  'RETURNED',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const PaymentStatusSchema = z.enum([
  'CREATED',
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'REVERSED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'DISPUTED',
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const ShippingStatusSchema = z.enum([
  'QUOTE_PENDING',
  'QUOTED',
  'BOOKING_PENDING',
  'BOOKED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_FAILED',
  'RETURN_REQUESTED',
  'RETURN_IN_TRANSIT',
  'RETURNED',
  'CANCELLED',
]);
export type ShippingStatus = z.infer<typeof ShippingStatusSchema>;

export const PaginationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export interface ApiMeta {
  correlationId: string;
}

export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    correlationId: string;
    details?: ReadonlyArray<{ field?: string; message: string }>;
  };
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export const CustomerRegistrationInputSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(12).max(128),
  displayName: z.string().trim().min(1).max(100).optional(),
});
export type CustomerRegistrationInput = z.infer<typeof CustomerRegistrationInputSchema>;

export const CustomerLoginInputSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(128),
});
export type CustomerLoginInput = z.infer<typeof CustomerLoginInputSchema>;

export const AuthEmailInputSchema = z.object({
  email: z.string().trim().email().max(320),
});
export type AuthEmailInput = z.infer<typeof AuthEmailInputSchema>;

export const AuthTokenInputSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});
export type AuthTokenInput = z.infer<typeof AuthTokenInputSchema>;

export const PasswordResetConfirmationInputSchema = AuthTokenInputSchema.extend({
  password: z.string().min(12).max(128),
});
export type PasswordResetConfirmationInput = z.infer<typeof PasswordResetConfirmationInputSchema>;

export const AuthUserStatusSchema = z.enum(['PENDING_VERIFICATION', 'ACTIVE']);
export type AuthUserStatus = z.infer<typeof AuthUserStatusSchema>;

export interface AuthUser {
  id: string;
  email: string;
  status: AuthUserStatus;
  emailVerifiedAt: string | null;
  displayName: string | null;
}

export interface AuthSession {
  id: string;
  expiresAt: string;
  user: AuthUser;
}

export const DesignConfigurationInputSchema = z.object({
  artworkVersionId: z.string().uuid(),
  garmentVariantId: z.string().uuid(),
  placementId: z.string().uuid(),
  scalePreset: z.string().min(1).max(64),
  view: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(100).default(1),
});
export type DesignConfigurationInput = z.infer<typeof DesignConfigurationInputSchema>;
