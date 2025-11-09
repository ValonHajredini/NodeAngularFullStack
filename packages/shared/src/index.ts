/**
 * Main entry point for shared types and utilities.
 * Exports all shared interfaces, types, and utilities used across the application.
 */
export * from './types/user.interface';
export * from './types/api-response.interface';
export * from './types/api-token.interface';
export * from './types/token-usage.interface';
export * from './types/storage.interface';
export * from './types/tools.interface';
export * from './types/forms.types';
export * from './types/theme.types';
export * from './types/tool-registry.types';
export * from './types/test-tool.types';
export * from './types/export.types';
export * from './types/validation.types';
export * from './types/tenant.types';
export * from './types/templates.types';
export * from './utils/validation';
// NOTE: SharedAuthService is NOT exported here because it's backend-only (uses pg Pool)
// Backend services should import it directly:
// import { SharedAuthService } from '@nodeangularfullstack/shared/services/shared-auth.service';