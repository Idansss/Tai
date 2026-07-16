import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  AdminMfaCodeInputSchema,
  AdminRoleAssignmentInputSchema,
  ArtworkCreateInputSchema,
  ArtworkVersionInputSchema,
  CatalogueEntryInputSchema,
  EditionInputSchema,
  StoryInputSchema,
  TagInputSchema,
  AuthTokenInputSchema,
  CustomerRegistrationInputSchema,
  DesignConfigurationInputSchema,
  ErrorCodeSchema,
  PaginationQuerySchema,
  PasswordResetConfirmationInputSchema,
  errorCodes,
} from './index.js';

const openApi = readFileSync(
  new URL('../../../docs/contracts/openapi.yaml', import.meta.url),
  'utf8',
);

describe('shared contracts', () => {
  it('normalises a bounded pagination query', () => {
    expect(PaginationQuerySchema.parse({ limit: '25' })).toEqual({ limit: 25 });
  });

  it('rejects unknown public error codes', () => {
    expect(ErrorCodeSchema.safeParse('SQL_ERROR').success).toBe(false);
  });

  it('requires identifiers for a design configuration', () => {
    expect(DesignConfigurationInputSchema.safeParse({}).success).toBe(false);
  });

  it('enforces customer authentication input boundaries', () => {
    expect(
      CustomerRegistrationInputSchema.safeParse({
        email: ' Customer@Example.com ',
        password: 'correct horse battery staple',
      }).success,
    ).toBe(true);
    expect(
      CustomerRegistrationInputSchema.safeParse({ email: 'bad', password: 'short' }).success,
    ).toBe(false);
    expect(AuthTokenInputSchema.safeParse({ token: 'not-a-token' }).success).toBe(false);
    expect(
      PasswordResetConfirmationInputSchema.safeParse({
        token: 'A'.repeat(43),
        password: 'new secure password',
      }).success,
    ).toBe(true);
  });

  it('enforces administrator MFA and role-assignment input boundaries', () => {
    expect(
      AdminMfaCodeInputSchema.safeParse({ challengeToken: 'A'.repeat(43), code: '123456' }).success,
    ).toBe(true);
    expect(
      AdminMfaCodeInputSchema.safeParse({ challengeToken: 'raw', code: '1234567' }).success,
    ).toBe(false);
    expect(
      AdminRoleAssignmentInputSchema.safeParse({ expiresAt: '2027-01-01T00:00:00Z' }).success,
    ).toBe(true);
    expect(AdminRoleAssignmentInputSchema.safeParse({ expiresAt: 'tomorrow' }).success).toBe(false);
  });

  it('enforces artwork slugs and immutable version input boundaries', () => {
    expect(
      ArtworkCreateInputSchema.safeParse({
        slug: 'lagos-after-dark',
        title: 'Lagos After Dark',
        metadata: { mood: 'electric' },
      }).success,
    ).toBe(true);
    expect(
      ArtworkCreateInputSchema.safeParse({ slug: 'Not URL Safe', title: 'Artwork' }).success,
    ).toBe(false);
    expect(ArtworkVersionInputSchema.safeParse({ title: '   ' }).success).toBe(false);
  });

  it('enforces catalogue content, edition, tag, and story boundaries', () => {
    expect(
      CatalogueEntryInputSchema.safeParse({ slug: 'night-city', title: 'Night City' }).success,
    ).toBe(true);
    expect(
      TagInputSchema.safeParse({ slug: 'night-city', name: 'Night City', kind: 'THEME' }).success,
    ).toBe(true);
    expect(
      EditionInputSchema.safeParse({ name: 'First', totalQuantity: 50, numbered: true }).success,
    ).toBe(true);
    expect(
      StoryInputSchema.safeParse({
        slug: 'making-art',
        title: 'Making Art',
        blocks: [{ type: 'TEXT', content: { text: 'Hello' } }],
      }).success,
    ).toBe(true);
  });

  it('keeps the public authentication contract and error catalogue in OpenAPI', () => {
    for (const operationId of [
      'registerCustomer',
      'loginCustomer',
      'logoutCustomer',
      'requestCustomerEmailVerification',
      'confirmCustomerEmailVerification',
      'requestCustomerPasswordReset',
      'confirmCustomerPasswordReset',
      'getCustomerSession',
      'revokeCustomerSession',
      'revokeAllCustomerSessions',
      'loginAdministrator',
      'beginAdministratorMfaEnrollment',
      'confirmAdministratorMfaEnrollment',
      'verifyAdministratorMfa',
      'logoutAdministrator',
      'getAdministratorSession',
      'revokeAdministratorSession',
      'listAdministratorRoles',
      'assignAdministratorRole',
      'revokeAdministratorRole',
      'listPublishedArtworks',
      'getPublishedArtwork',
      'listAdministratorArtworks',
      'getAdministratorArtwork',
      'createAdministratorArtwork',
      'createAdministratorArtworkVersion',
      'publishAdministratorArtworkVersion',
      'archiveAdministratorArtworkVersion',
      'archiveAdministratorArtwork',
      'listAdministratorTags',
      'createAdministratorTag',
      'updateAdministratorTag',
      'deleteAdministratorTag',
      'attachAdministratorArtworkTag',
      'detachAdministratorArtworkTag',
      'listAdministratorCollections',
      'createAdministratorCollection',
      'updateAdministratorCollection',
      'deleteAdministratorCollection',
      'attachAdministratorCollectionArtwork',
      'detachAdministratorCollectionArtwork',
      'listAdministratorDrops',
      'createAdministratorDrop',
      'updateAdministratorDrop',
      'deleteAdministratorDrop',
      'attachAdministratorDropArtwork',
      'detachAdministratorDropArtwork',
      'listAdministratorEditions',
      'createAdministratorEdition',
      'updateAdministratorEdition',
      'deleteAdministratorEdition',
      'listAdministratorStories',
      'createAdministratorStory',
      'updateAdministratorStory',
      'deleteAdministratorStory',
      'listPublishedCollections',
      'getPublishedCollection',
      'listPublishedDrops',
      'getPublishedDrop',
      'listPublishedStories',
      'getPublishedStory',
    ]) {
      expect(openApi).toContain(`operationId: ${operationId}`);
    }
    for (const code of errorCodes) expect(openApi).toContain(code);
  });
});
