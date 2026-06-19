/**
 * Appwrite Auth Adapter
 * Mirrors the Appwrite Auth API pattern
 */

import { account, client, databases, DATABASE_ID, COLLECTIONS } from 'src/boot/appwrite';
import { ID, Query } from 'appwrite';

export interface AuthResponse {
  user: AppwriteUser | null;
  session: any | null;
  error: Error | null;
}

export interface AppwriteUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  phone?: string;
  avatar_url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  company_id: string;
  full_name: string;
  role: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  two_fa_enabled?: boolean;
}

// Convert Appwrite user to our format
function mapUser(accountUser: any): AppwriteUser {
  return {
    id: accountUser.$id,
    email: accountUser.email,
    emailVerified: accountUser.emailVerification,
    name: accountUser.name,
    phone: accountUser.phone,
    avatar_url: accountUser.prefs?.avatar_url,
    createdAt: accountUser.$createdAt,
    updatedAt: accountUser.$updatedAt,
  };
}

export const appwriteAuth = {
  // Sign up with email/password
  async signUp(email: string, password: string, name?: string): Promise<AuthResponse> {
    try {
      const user = await account.create(
        ID.unique(),
        email,
        password,
        name || email.split('@')[0]
      );

      // Auto-create session after signup
      const session = await account.createEmailSession(email, password);

      return {
        user: mapUser(user),
        session,
        error: null
      };
    } catch (error) {
      console.error('[Appwrite Auth] Sign up error:', error);
      return { user: null, session: null, error: error as Error };
    }
  },

  // Sign in with email/password
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const session = await account.createEmailSession(email, password);
      const user = await account.get();

      return {
        user: mapUser(user),
        session,
        error: null
      };
    } catch (error) {
      console.error('[Appwrite Auth] Sign in error:', error);
      return { user: null, session: null, error: error as Error };
    }
  },

  // Sign out
  async signOut(): Promise<{ error: Error | null }> {
    try {
      await account.deleteSession('current');
      return { error: null };
    } catch (error) {
      console.error('[Appwrite Auth] Sign out error:', error);
      return { error: error as Error };
    }
  },

  // Get current user
  async getCurrentUser(): Promise<{ user: AppwriteUser | null; error: Error | null }> {
    try {
      const user = await account.get();
      return {
        user: mapUser(user),
        error: null
      };
    } catch (error) {
      // User not logged in is not really an error
      if ((error as any)?.code === 401) {
        return { user: null, error: null };
      }
      console.error('[Appwrite Auth] Get user error:', error);
      return { user: null, error: error as Error };
    }
  },

  // Get session
  async getSession(): Promise<{ session: any | null; error: Error | null }> {
    try {
      const session = await account.getSession('current');
      return { session, error: null };
    } catch (error) {
      return { session: null, error: error as Error };
    }
  },

  // Update user
  async updateUser(data: Partial<AppwriteUser>): Promise<{ user: AppwriteUser | null; error: Error | null }> {
    try {
      if (data.name) {
        await account.updateName(data.name);
      }
      if (data.email) {
        await account.updateEmail(data.email, ''); // Requires current password
      }
      if (data.phone) {
        await account.updatePhone(data.phone, ''); // Requires password
      }

      const user = await account.get();
      return { user: mapUser(user), error: null };
    } catch (error) {
      console.error('[Appwrite Auth] Update user error:', error);
      return { user: null, error: error as Error };
    }
  },

  // Update password
  async updatePassword(newPassword: string, currentPassword?: string): Promise<{ error: Error | null }> {
    try {
      await account.updatePassword(newPassword, currentPassword);
      return { error: null };
    } catch (error) {
      console.error('[Appwrite Auth] Update password error:', error);
      return { error: error as Error };
    }
  },

  // Reset password (send email)
  async resetPassword(email: string, redirectUrl?: string): Promise<{ error: Error | null }> {
    try {
      await account.createRecovery(
        email,
        redirectUrl || `${window.location.origin}/auth/reset-password`
      );
      return { error: null };
    } catch (error) {
      console.error('[Appwrite Auth] Reset password error:', error);
      return { error: error as Error };
    }
  },

  // Confirm reset password
  async confirmResetPassword(userId: string, secret: string, newPassword: string): Promise<{ error: Error | null }> {
    try {
      await account.updateRecovery(userId, secret, newPassword, newPassword);
      return { error: null };
    } catch (error) {
      console.error('[Appwrite Auth] Confirm reset error:', error);
      return { error: error as Error };
    }
  },

  // OAuth sign in
  async signInWithOAuth(provider: 'google' | 'github' | 'microsoft' | 'apple'): Promise<void> {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    account.createOAuth2Session(provider as any, redirectUrl, redirectUrl);
  },

  // Verify email
  async sendEmailVerification(redirectUrl?: string): Promise<{ error: Error | null }> {
    try {
      await account.createVerification(
        redirectUrl || `${window.location.origin}/auth/verify-email`
      );
      return { error: null };
    } catch (error) {
      console.error('[Appwrite Auth] Send verification error:', error);
      return { error: error as Error };
    }
  },

  // Confirm email verification
  async confirmEmailVerification(userId: string, secret: string): Promise<{ error: Error | null }> {
    try {
      await account.updateVerification(userId, secret);
      return { error: null };
    } catch (error) {
      console.error('[Appwrite Auth] Confirm verification error:', error);
      return { error: error as Error };
    }
  },

  // Refresh session (Appwrite handles this automatically)
  async refreshSession(): Promise<{ session: any | null; error: Error | null }> {
    try {
      const session = await account.getSession('current');
      return { session, error: null };
    } catch (error) {
      return { session: null, error: error as Error };
    }
  },

  // Load user profile from user_profiles collection
  async loadUserProfile(userId: string): Promise<{ profile: UserProfile | null; error: Error | null }> {
    try {
      const { data, error } = await this.getUserProfileByUserId(userId);
      if (error) throw error;
      return { profile: data, error: null };
    } catch (error) {
      console.error('[Appwrite Auth] Load profile error:', error);
      return { profile: null, error: error as Error };
    }
  },

  // Get user profile by user_id
  async getUserProfileByUserId(userId: string): Promise<{ data: UserProfile | null; error: Error | null }> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        [Query.equal('user_id', userId)]
      );

      if (response.documents.length > 0) {
        return { data: response.documents[0] as unknown as UserProfile, error: null };
      }
      return { data: null, error: null };
    } catch (error) {
      console.error('[Appwrite Auth] Get profile error:', error);
      return { data: null, error: error as Error };
    }
  },

  // Create user profile
  async createUserProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: UserProfile | null; error: Error | null }> {
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        ID.unique(),
        {
          ...profile,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );
      return { data: response as unknown as UserProfile, error: null };
    } catch (error) {
      console.error('[Appwrite Auth] Create profile error:', error);
      return { data: null, error: error as Error };
    }
  },

  // Update user profile
  async updateUserProfile(profileId: string, updates: Partial<UserProfile>): Promise<{ data: UserProfile | null; error: Error | null }> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        profileId,
        {
          ...updates,
          updated_at: new Date().toISOString(),
        }
      );
      return { data: response as unknown as UserProfile, error: null };
    } catch (error) {
      console.error('[Appwrite Auth] Update profile error:', error);
      return { data: null, error: error as Error };
    }
  },

  // Subscribe to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void): () => void {
    // Appwrite doesn't have real-time auth events like Supabase
    // We'll poll or use a custom solution
    const checkInterval = setInterval(async () => {
      try {
        const session = await account.getSession('current');
        callback('SIGNED_IN', session);
      } catch {
        callback('SIGNED_OUT', null);
      }
    }, 30000); // Check every 30 seconds

    // Return unsubscribe function
    return () => clearInterval(checkInterval);
  },

  // Admin functions
  admin: {
    // List all users (requires admin key)
    async listUsers(): Promise<{ users: AppwriteUser[]; error: Error | null }> {
      try {
        // This requires server-side admin SDK
        throw new Error('List users requires server-side admin SDK');
      } catch (error) {
        return { users: [], error: error as Error };
      }
    },

    // Delete user (requires admin key)
    async deleteUser(userId: string): Promise<{ error: Error | null }> {
      try {
        throw new Error('Delete user requires server-side admin SDK');
      } catch (error) {
        return { error: error as Error };
      }
    },
  },

  async sendPasswordRecovery(email: string): Promise<{ data: any; error: Error | null }> {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      await account.createRecovery(email, `${origin}/auth/reset-password`);
      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },
};

export default appwriteAuth;
