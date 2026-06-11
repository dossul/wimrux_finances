
import { functions } from 'src/boot/appwrite';
/**
 * AES-256-CBC encryption/decryption via Edge Function.
 * Sensitive data (jwt_secret, API keys) are encrypted before storage
 * and decrypted only when needed.
 */
export function useCrypto() {
  async function encrypt(plaintext: string): Promise<{ ciphertext: string; error: string | null }> {
    try {
      const { data, error } = await (async () => { try { const r = await functions.createExecution('crypto-aes256', JSON.stringify({ action: 'encrypt', data: plaintext })); return { data: (() => { try { return JSON.parse(r.responseBody); } catch { return r.responseBody; } })(), error: null }; } catch(e) { return { data: null, error: e as Error }; } })();
      if (error) return { ciphertext: '', error: error.message };
      const result = data as { ciphertext: string };
      return { ciphertext: result.ciphertext, error: null };
    } catch (err: unknown) {
      return { ciphertext: '', error: err instanceof Error ? err.message : 'Encryption failed' };
    }
  }

  async function decrypt(ciphertext: string): Promise<{ plaintext: string; error: string | null }> {
    try {
      const { data, error } = await (async () => { try { const r = await functions.createExecution('crypto-aes256', JSON.stringify({ action: 'decrypt', data: ciphertext })); return { data: (() => { try { return JSON.parse(r.responseBody); } catch { return r.responseBody; } })(), error: null }; } catch(e) { return { data: null, error: e as Error }; } })();
      if (error) return { plaintext: '', error: error.message };
      const result = data as { plaintext: string };
      return { plaintext: result.plaintext, error: null };
    } catch (err: unknown) {
      return { plaintext: '', error: err instanceof Error ? err.message : 'Decryption failed' };
    }
  }

  return { encrypt, decrypt };
}
