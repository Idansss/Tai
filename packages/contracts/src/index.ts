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
  'CONFIGURATION_NOT_APPROVED',
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

export const GarmentTypeSchema = z.enum([
  'CLASSIC_TSHIRT',
  'OVERSIZED_TSHIRT',
  'LONG_SLEEVE',
  'HOODIE',
  'SWEATSHIRT',
  'TOTE_BAG',
  'CAP',
  'ART_PRINT',
]);
export type GarmentType = z.infer<typeof GarmentTypeSchema>;

export const GarmentViewSchema = z.enum(['FRONT', 'BACK', 'LEFT', 'RIGHT']);
export type GarmentView = z.infer<typeof GarmentViewSchema>;

export const CompatibilityStatusSchema = z.enum(['DRAFT', 'APPROVED', 'ARCHIVED']);
export type CompatibilityStatus = z.infer<typeof CompatibilityStatusSchema>;

export const GarmentTemplateInputSchema = z.object({
  slug: ArtworkSlugSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10_000).nullable().optional(),
  type: GarmentTypeSchema,
  fabric: z.string().trim().max(500).nullable().optional(),
  fit: z.string().trim().max(500).nullable().optional(),
  care: z.string().trim().max(10_000).nullable().optional(),
});
export type GarmentTemplateInput = z.infer<typeof GarmentTemplateInputSchema>;

export const GarmentTemplateUpdateInputSchema = GarmentTemplateInputSchema.partial()
  .extend({ status: ArtworkStatusSchema.optional() })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: 'At least one garment field is required.',
  });
export type GarmentTemplateUpdateInput = z.infer<typeof GarmentTemplateUpdateInputSchema>;

export const GarmentColourInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(100),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  position: z.number().int().nonnegative().default(0),
  status: ArtworkStatusSchema.optional(),
});
export type GarmentColourInput = z.infer<typeof GarmentColourInputSchema>;

export const GarmentMeasurementInputSchema = z.object({
  key: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/)
    .max(64),
  label: z.string().trim().min(1).max(100),
  valueMm: z.number().int().positive(),
});
export const GarmentSizeInputSchema = z.object({
  code: z.string().trim().min(1).max(32),
  label: z.string().trim().min(1).max(100),
  position: z.number().int().nonnegative().default(0),
  status: ArtworkStatusSchema.optional(),
  measurements: z.array(GarmentMeasurementInputSchema).max(50).default([]),
});
export type GarmentSizeInput = z.infer<typeof GarmentSizeInputSchema>;

export const GarmentVariantInputSchema = z.object({
  colourId: z.string().uuid(),
  sizeId: z.string().uuid(),
  sku: z.string().trim().min(1).max(80),
  status: ArtworkStatusSchema.optional(),
});
export type GarmentVariantInput = z.infer<typeof GarmentVariantInputSchema>;

export const GarmentPlacementInputSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().trim().min(1).max(100),
    view: GarmentViewSchema,
    xPermille: z.number().int().min(0).max(999),
    yPermille: z.number().int().min(0).max(999),
    widthPermille: z.number().int().min(1).max(1000),
    heightPermille: z.number().int().min(1).max(1000),
    printWidthMm: z.number().int().positive(),
    printHeightMm: z.number().int().positive(),
    position: z.number().int().nonnegative().default(0),
    status: ArtworkStatusSchema.optional(),
  })
  .refine((value) => value.xPermille + value.widthPermille <= 1000, {
    message: 'Placement width exceeds the normalized canvas.',
    path: ['widthPermille'],
  })
  .refine((value) => value.yPermille + value.heightPermille <= 1000, {
    message: 'Placement height exceeds the normalized canvas.',
    path: ['heightPermille'],
  });
export type GarmentPlacementInput = z.infer<typeof GarmentPlacementInputSchema>;

export const GarmentScalePresetInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(100),
  scalePercent: z.number().int().min(1).max(100),
  position: z.number().int().nonnegative().default(0),
  status: ArtworkStatusSchema.optional(),
});
export type GarmentScalePresetInput = z.infer<typeof GarmentScalePresetInputSchema>;

/** Integer minor units only. Money is never a float. The base currency is NGN (kobo). */
export const MoneyMinorSchema = z.number().int().positive().max(100_000_000);
export const CurrencySchema = z.string().regex(/^[A-Z]{3}$/);

export interface Money {
  amountMinor: number;
  currency: string;
}

export const ArtworkGarmentCompatibilityInputSchema = z
  .object({
    status: CompatibilityStatusSchema,
    placementIds: z.array(z.string().uuid()).max(50).default([]),
    /** Required exactly when approving, and rejected otherwise. See ADR-015. */
    unitPriceMinor: MoneyMinorSchema.optional(),
    currency: CurrencySchema.optional(),
  })
  .refine((value) => new Set(value.placementIds).size === value.placementIds.length, {
    message: 'Compatibility placement identifiers must be unique.',
    path: ['placementIds'],
  })
  .refine(
    (value) =>
      value.status === 'APPROVED'
        ? value.unitPriceMinor !== undefined && value.currency !== undefined
        : value.unitPriceMinor === undefined && value.currency === undefined,
    {
      message: 'An approved compatibility requires a price and currency, and only then.',
      path: ['unitPriceMinor'],
    },
  );
export type ArtworkGarmentCompatibilityInput = z.infer<
  typeof ArtworkGarmentCompatibilityInputSchema
>;

export interface GarmentColour extends GarmentColourInput {
  id: string;
  templateId: string;
  status: ArtworkStatus;
}

export interface GarmentMeasurement {
  id: string;
  key: string;
  label: string;
  valueMm: number;
}

export interface GarmentSize {
  id: string;
  templateId: string;
  code: string;
  label: string;
  position: number;
  status: ArtworkStatus;
  measurements: GarmentMeasurement[];
}

export interface GarmentVariant extends GarmentVariantInput {
  id: string;
  templateId: string;
  status: ArtworkStatus;
}

export interface GarmentScalePreset extends GarmentScalePresetInput {
  id: string;
  placementId: string;
  status: ArtworkStatus;
}

export interface GarmentPlacement extends GarmentPlacementInput {
  id: string;
  templateId: string;
  status: ArtworkStatus;
  scalePresets: GarmentScalePreset[];
}

export interface GarmentTemplate extends GarmentTemplateInput {
  id: string;
  status: ArtworkStatus;
  colours: GarmentColour[];
  sizes: GarmentSize[];
  variants: GarmentVariant[];
  placements: GarmentPlacement[];
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArtworkGarmentCompatibility {
  id: string;
  artworkVersionId: string;
  templateId: string;
  status: CompatibilityStatus;
  placements: Array<{ placement: GarmentPlacement }>;
  template: GarmentTemplate;
  approvedAt: string | null;
  archivedAt: string | null;
}

export const DesignConfigurationInputSchema = z.object({
  artworkVersionId: z.string().uuid(),
  garmentVariantId: z.string().uuid(),
  placementId: z.string().uuid(),
  scalePreset: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  view: GarmentViewSchema,
  quantity: z.number().int().min(1).max(100).default(1),
});
export type DesignConfigurationInput = z.infer<typeof DesignConfigurationInputSchema>;

/**
 * Why a priced, approved configuration still cannot be bought right now. Stock is deliberately
 * absent: garment inventory is TMS-B4-001 and will refine this, so `AVAILABLE` here means
 * "the catalogue permits this sale", never "a unit is reserved for you".
 */
export const AvailabilityStateSchema = z.enum([
  'AVAILABLE',
  'DROP_NOT_OPEN',
  'DROP_ENDED',
  'EDITION_EXHAUSTED',
]);
export type AvailabilityState = z.infer<typeof AvailabilityStateSchema>;

export interface ConfigurationAvailability {
  state: AvailabilityState;
  /** Present only when the state is time-bounded by a drop. */
  opensAt: string | null;
  closesAt: string | null;
}

export interface GarmentConfigurationValidation {
  valid: true;
  artworkId: string;
  artworkVersionId: string;
  garmentTemplateId: string;
  garmentVariantId: string;
  placementId: string;
  scalePresetId: string;
  view: GarmentView;
  quantity: number;
  /** Server-authoritative. Never trust a browser-supplied price. */
  unitPrice: Money;
  /** unitPrice.amountMinor * quantity, computed server-side in integer minor units. */
  totalPrice: Money;
  availability: ConfigurationAvailability;
}
