/**
 * Appwrite Realtime Adapter
 * Mirrors the Appwrite Realtime API pattern
 */

import { client } from 'src/boot/appwrite';
import type { RealtimeResponseEvent } from 'appwrite';

export type RealtimeCallback = (payload: any) => void;

export interface RealtimeSubscription {
  unsubscribe: () => void;
}

export const appwriteRealtime = {
  // Subscribe to database changes
  subscribe(
    channels: string | string[],
    callback: RealtimeCallback
  ): RealtimeSubscription {
    const channelList = Array.isArray(channels) ? channels : [channels];
    
    try {
      // Appwrite realtime uses client.subscribe
      const unsubscribe = client.subscribe(channelList, (response: RealtimeResponseEvent<any>) => {
        // Map Appwrite event format to our callback
        callback({
          event: response.events[0] || 'unknown',
          payload: response.payload,
          timestamp: response.timestamp,
        });
      });

      return {
        unsubscribe: () => {
          unsubscribe();
        },
      };
    } catch (error) {
      console.error('[Appwrite Realtime] Subscribe error:', error);
      // Return dummy subscription on error
      return {
        unsubscribe: () => {},
      };
    }
  },

  // Subscribe to table/collection changes
  subscribeToTable(
    table: string,
    callback: RealtimeCallback,
    eventFilter?: string[]
  ): RealtimeSubscription {
    // Appwrite uses 'databases.{databaseId}.collections.{collectionId}.documents' format
    const channel = `databases.*.collections.${table}.documents`;
    
    return this.subscribe(channel, (response) => {
      // Filter by event type if specified
      if (eventFilter && !eventFilter.some(e => response.event.includes(e))) {
        return;
      }
      callback(response);
    });
  },

  // Subscribe to specific document
  subscribeToRow(
    table: string,
    rowId: string,
    callback: RealtimeCallback
  ): RealtimeSubscription {
    const channel = `databases.*.collections.${table}.documents.${rowId}`;
    return this.subscribe(channel, callback);
  },

  // Subscribe to auth changes (simulated with polling)
  subscribeToAuth(callback: (event: string, session: any) => void): () => void {
    // Appwrite doesn't have direct realtime auth events
    // We'll check session periodically
    const interval = setInterval(async () => {
      try {
        const { Account } = await import('appwrite');
        const account = new Account(client);
        const session = await account.getSession('current');
        callback('SIGNED_IN', session);
      } catch {
        callback('SIGNED_OUT', null);
      }
    }, 30000);

    return () => clearInterval(interval);
  },

  // Unsubscribe all
  unsubscribeAll(): void {
    // Appwrite handles this automatically when client is destroyed
    // Individual subscriptions are managed by their unsubscribe functions
  },

  // Helper to build channel names
  getChannels: {
    // Database collections
    collection(collectionId: string): string {
      return `databases.*.collections.${collectionId}.documents`;
    },

    // Specific document
    document(collectionId: string, documentId: string): string {
      return `databases.*.collections.${collectionId}.documents.${documentId}`;
    },

    // All databases
    allDatabases(): string {
      return 'databases.*.collections.*.documents';
    },

    // Files in a bucket
    bucket(bucketId: string): string {
      return `buckets.${bucketId}.files`;
    },

    // Specific file
    file(bucketId: string, fileId: string): string {
      return `buckets.${bucketId}.files.${fileId}`;
    },

    // Teams (if using)
    team(teamId: string): string {
      return `teams.${teamId}`;
    },

    // User membership
    membership(teamId: string): string {
      return `teams.${teamId}.memberships`;
    },

    // Account
    account(): string {
      return 'account';
    },
  },
};

export default appwriteRealtime;
