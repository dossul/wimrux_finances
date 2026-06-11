/**
 * useDatabase — Appwrite backend only.
 */
import { appwriteDb } from 'src/services/appwrite-db';

export function useDatabase() {
  return {
    from: appwriteDb.from.bind(appwriteDb),
    getById: appwriteDb.getById.bind(appwriteDb),
    deleteById: appwriteDb.deleteById.bind(appwriteDb),
    backend: 'appwrite',
    useAppwrite: true,
  };
}

export default useDatabase;
