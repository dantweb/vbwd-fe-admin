/**
 * Shared API Client Instance
 *
 * Singleton ApiClient used by all stores and components.
 * Auth token management is handled by the auth store.
 */
import { ApiClient } from '@dantweb/view-component';

// Singleton API client instance
export const api = new ApiClient({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1'
});
