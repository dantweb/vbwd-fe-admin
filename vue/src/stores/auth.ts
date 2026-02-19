/**
 * Auth Store - Re-export from core SDK
 *
 * This file re-exports the auth store from @dantweb/view-component
 * for backward compatibility with existing imports.
 */
export {
  useAuthStore,
  configureAuthStore,
  type AuthUser,
  type AuthState,
  type AuthStore,
  type AuthStoreConfig,
  type LoginCredentials,
  type LoginResponse,
} from '@dantweb/view-component';

// Legacy type aliases for backward compatibility
export type AdminUser = import('@dantweb/view-component').AuthUser;
