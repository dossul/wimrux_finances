import { Page } from '@playwright/test';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || '6a29285200015cd421c7';
const APPWRITE_DATABASE = process.env.APPWRITE_DATABASE || 'wimrux_finances';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

function generateId(): string {
  return crypto.randomUUID();
}

async function appwriteFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const url = new URL(`${APPWRITE_ENDPOINT}${path}`);
  const res = await fetch(url.toString(), {
    ...options,
    headers: {
      'X-Appwrite-Project': APPWRITE_PROJECT,
      'X-Appwrite-Key': APPWRITE_API_KEY as string,
      'X-Appwrite-Response-Format': '1.4.0',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Appwrite ${res.status}: ${text}`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json') || res.status === 204) {
    return null;
  }
  return res.json();
}

export async function ensureAiCreditPackExists(
  page: Page,
  pack: {
    code?: string;
    name: string;
    creditsUsd: number;
    priceXof: number;
    priceUsd: number;
  }
): Promise<string | null> {
  // Vérifier si un pack actif existe déjà via l'API frontale
  const existing = await page.evaluate(async () => {
    const databases = (window as any).__appwriteDatabases;
    const databaseId = (window as any).__appwriteDatabaseId;
    const { data } = await databases.listDocuments(
      databaseId,
      'ai_credit_packs',
      ['equal("is_active",true)', 'limit(1)']
    );
    return (data?.documents?.[0]?.$id as string) || null;
  });

  if (existing) return existing;

  if (!APPWRITE_API_KEY) {
    console.warn('[E2E] APPWRITE_API_KEY non configuré — impossible de créer un pack IA');
    return null;
  }

  const documentId = generateId();
  const code = pack.code || `E2E-${Date.now()}`;
  const payload = {
    id: documentId,
    code,
    name: pack.name,
    credits_usd: pack.creditsUsd,
    price_xof: pack.priceXof,
    price_usd: pack.priceUsd,
    is_active: true,
  };

  try {
    const response = (await appwriteFetch(
      `/databases/${APPWRITE_DATABASE}/collections/ai_credit_packs/documents`,
      {
        method: 'POST',
        body: JSON.stringify({
          documentId,
          data: payload,
          permissions: ['read("users")', 'write("users")', 'update("users")', 'delete("users")'],
        }),
      }
    )) as { $id: string };
    return response.$id;
  } catch (e: unknown) {
    console.warn('[E2E] Impossible de créer le pack IA :', (e as Error).message);
    return null;
  }
}
