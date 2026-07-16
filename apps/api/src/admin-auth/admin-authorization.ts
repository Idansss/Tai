import { SetMetadata } from '@nestjs/common';

import { ADMIN_MFA_METADATA, ADMIN_PERMISSION_METADATA } from './admin-auth.tokens.js';

export const RequireAdminPermissions = (...permissions: string[]) =>
  SetMetadata(ADMIN_PERMISSION_METADATA, permissions);

export const RequireAdminMfa = () => SetMetadata(ADMIN_MFA_METADATA, true);
