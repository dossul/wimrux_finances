/**
 * Appwrite Services Index
 * Centralized exports for all Appwrite adapters
 */

// Core SDK exports from boot
export {
  client,
  account,
  databases,
  storage,
  functions,
  DATABASE_ID,
  COLLECTIONS,
  BUCKETS,
  generateId,
} from '../boot/appwrite';

// Database adapter
export { appwriteDb, type DbQueryBuilder } from './appwrite-db';

// Auth adapter
export {
  appwriteAuth,
  type AuthResponse,
  type AppwriteUser,
  type UserProfile,
} from './appwrite-auth';

// Storage adapter
export {
  appwriteStorage,
  type StorageUploadResponse,
  type StorageFile,
} from './appwrite-storage';

// Realtime adapter
export {
  appwriteRealtime,
  type RealtimeCallback,
  type RealtimeSubscription,
} from './appwrite-realtime';

// Combined default export for ease of use
import { appwriteDb } from './appwrite-db';
import { appwriteAuth } from './appwrite-auth';
import { appwriteStorage } from './appwrite-storage';
import { appwriteRealtime } from './appwrite-realtime';

export const appwrite = {
  db: appwriteDb,
  auth: appwriteAuth,
  storage: appwriteStorage,
  realtime: appwriteRealtime,
};

export default appwrite;
