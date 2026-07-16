import { z } from 'zod';

export const apiVersion = 'v1' as const;

export const errorCodes = [
  'VALIDATION_FAILED',
  'AUTHENTICATION_REQUIRED',
  'AUTHENTICATION_INVALID',
  'EMAIL_VERIFICATION_REQUIRED',
  'TOKEN_INVALID_OR_EXPIRED',
  'SESSION_INVALID',
  'ADMIN_MFA_REQUIRED',
  'MFA_CHALLENGE_INVALID',
  'MFA_CODE_INVALID',
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

export const AdminLoginInputSchema = CustomerLoginInputSchema;
export type AdminLoginInput = z.infer<typeof AdminLoginInputSchema>;

export const AdminMfaChallengeInputSchema = z.object({
  challengeToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});
export type AdminMfaChallengeInput = z.infer<typeof AdminMfaChallengeInputSchema>;

export const AdminMfaCodeInputSchema = AdminMfaChallengeInputSchema.extend({
  code: z.string().regex(/^\d{6}$/),
});
export type AdminMfaCodeInput = z.infer<typeof AdminMfaCodeInputSchema>;

export const AdminRoleAssignmentInputSchema = z.object({
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
});
export type AdminRoleAssignmentInput = z.infer<typeof AdminRoleAssignmentInputSchema>;

export type AdminAssuranceLevel = 'PASSWORD' | 'MFA';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  mfaRequired: boolean;
  mfaEnrolled: boolean;
}

export interface AdminSession {
  id: string;
  expiresAt: string;
  assuranceLevel: AdminAssuranceLevel;
  user: AdminUser;
}

export interface AdminAuthChallenge {
  status: 'MFA_ENROLLMENT_REQUIRED' | 'MFA_REQUIRED';
  challengeToken: string;
  expiresAt: string;
}

export interface AdminTotpEnrollment {
  secret: string;
  otpauthUri: string;
}

export interface AdminRole {
  code: string;
  name: string;
  description: string | null;
  permissions: string[];
}

export const ArtworkStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type ArtworkStatus = z.infer<typeof ArtworkStatusSchema>;

export const ArtworkSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const ArtworkVersionInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  shortStory: z.string().trim().max(500).nullable().optional(),
  story: z.string().trim().max(10_000).nullable().optional(),
  inspiration: z.string().trim().max(5_000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ArtworkVersionInput = z.infer<typeof ArtworkVersionInputSchema>;

export const ArtworkCreateInputSchema = ArtworkVersionInputSchema.extend({
  slug: ArtworkSlugSchema,
});
export type ArtworkCreateInput = z.infer<typeof ArtworkCreateInputSchema>;

export interface ArtworkVersion {
  id: string;
  versionNumber: number;
  status: ArtworkStatus;
  title: string;
  shortStory: string | null;
  story: string | null;
  inspiration: string | null;
  metadata: Record<string, unknown>;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
}

export interface Artwork {
  id: string;
  slug: string;
  status: ArtworkStatus;
  publishedVersion: ArtworkVersion | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
  tags?: CatalogueTag[];
  collections?: CatalogueEntry[];
  drops?: CatalogueEntry[];
  editions?: Edition[];
}

export interface AdminArtwork extends Artwork {
  versions: ArtworkVersion[];
}

export const TagKindSchema = z.enum(['GENERAL', 'THEME', 'MOOD', 'COLOUR_FAMILY']);
export type TagKind = z.infer<typeof TagKindSchema>;

export const TagInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(100),
  kind: TagKindSchema.default('GENERAL'),
});
export type TagInput = z.infer<typeof TagInputSchema>;

export const CatalogueEntryInputSchema = z.object({
  slug: ArtworkSlugSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10_000).nullable().optional(),
});
export type CatalogueEntryInput = z.infer<typeof CatalogueEntryInputSchema>;

export const CatalogueEntryUpdateInputSchema = CatalogueEntryInputSchema.partial().extend({
  status: ArtworkStatusSchema.optional(),
});
export type CatalogueEntryUpdateInput = z.infer<typeof CatalogueEntryUpdateInputSchema>;

export const DropInputSchema = CatalogueEntryInputSchema.extend({
  startsAt: z.iso.datetime().nullable().optional(),
  endsAt: z.iso.datetime().nullable().optional(),
}).refine((value) => !value.endsAt || (!!value.startsAt && value.endsAt > value.startsAt), {
  message: 'A drop end time must be after its start time.',
  path: ['endsAt'],
});
export type DropInput = z.infer<typeof DropInputSchema>;

export const EditionInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    totalQuantity: z.number().int().positive().nullable().optional(),
    numbered: z.boolean().default(false),
    status: ArtworkStatusSchema.optional(),
  })
  .refine((value) => !value.numbered || !!value.totalQuantity, {
    message: 'A numbered edition requires a total quantity.',
    path: ['totalQuantity'],
  });
export type EditionInput = z.infer<typeof EditionInputSchema>;

export const StoryBlockInputSchema = z.object({
  type: z.enum(['TEXT', 'IMAGE', 'QUOTE', 'EMBED']),
  content: z.record(z.string(), z.unknown()),
});
export const StoryInputSchema = z
  .object({
    slug: ArtworkSlugSchema,
    title: z.string().trim().min(1).max(200),
    excerpt: z.string().trim().max(500).nullable().optional(),
    artworkId: z.string().uuid().nullable().optional(),
    collectionId: z.string().uuid().nullable().optional(),
    blocks: z.array(StoryBlockInputSchema).max(100).default([]),
    status: ArtworkStatusSchema.optional(),
  })
  .refine((value) => !(value.artworkId && value.collectionId), {
    message: 'A story can belong to an artwork or a collection, not both.',
    path: ['collectionId'],
  });
export type StoryInput = z.infer<typeof StoryInputSchema>;

export interface CatalogueTag {
  id: string;
  slug: string;
  name: string;
  kind: TagKind;
}

export interface CatalogueEntry {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: ArtworkStatus;
  publishedAt: string | null;
  archivedAt: string | null;
}

export interface Edition {
  id: string;
  artworkId: string;
  name: string;
  totalQuantity: number | null;
  numbered: boolean;
  status: ArtworkStatus;
  releasedAt: string | null;
}

export interface StoryBlock {
  id: string;
  position: number;
  type: 'TEXT' | 'IMAGE' | 'QUOTE' | 'EMBED';
  content: Record<string, unknown>;
}

export interface Story {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: ArtworkStatus;
  artworkId: string | null;
  collectionId: string | null;
  blocks: StoryBlock[];
  publishedAt: string | null;
  archivedAt: string | null;
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
