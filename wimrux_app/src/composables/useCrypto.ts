import { insforge } from 'src/boot/insforge';

/**
 * AES-256-CBC encryption/decryption via Edge Function.
 * Sensitive data (jwt_secret, API keys) are encrypted before storage
 * and decrypted only when needed.
 */
export function useCrypto() {
  async function encrypt(plaintext: string): Promise<{ ciphertext: string; error: string | null }> {
    try {
      const { data, error } = await insforge.functions.invoke('crypto-aes256', {
        body: { action: 'encrypt', data: plaintext },
      });
      if (error) return { ciphertext: '', error: error.message };
      const result = data as { ciphertext: string };
      return { ciphertext: result.ciphertext, error: null };
    } catch (err: unknown) {
      return { ciphertext: '', error: err instanceof Error ? err.message : 'Encryption failed' };
    }
  }

  async function decrypt(ciphertext: string): Promise<{ plaintext: string; error: string | null }> {
    try {
      const { data, error } = await insforge.functions.invoke('crypto-aes256', {
        body: { action: 'decrypt', data: ciphertext },
      });
      if (error) return { plaintext: '', error: error.message };
      const result = data as { plaintext: string };
      return { plaintext: result.plaintext, error: null };
    } catch (err: unknown) {
      return { plaintext: '', error: err instanceof Error ? err.message : 'Decryption failed' };
    }
  }

  return { encrypt, decrypt };
}
