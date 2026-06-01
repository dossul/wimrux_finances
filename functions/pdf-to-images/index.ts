/**
 * pdf-to-images — Proxy Stirling PDF vers PNG base64
 * Stratégie : appel page par page avec singleOrMultiple=single (PNG direct, pas de ZIP)
 */

const STIRLING_URL = 'https://pdf.ulia.site';
const STIRLING_KEY = Deno.env.get('STIRLING_API_KEY') || '6448aa81-0943-49d6-b3ee-165b9e8ec5c4';
const MAX_PAGES    = 4;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return json({ error: 'Champ "file" manquant' }, 400);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    let images: string[] = [];

    if (isPdf) {
      // ── Stirling : une requête par page, retourne PNG binaire direct ──────
      // On essaie d'abord de connaître le nombre de pages via /api/v1/general/get-info-on-pdf
      let totalPages = 1;
      try {
        const infoForm = new FormData();
        infoForm.append('fileInput', file);
        const infoRes = await fetch(`${STIRLING_URL}/api/v1/general/get-info-on-pdf`, {
          method: 'POST',
          headers: { 'X-API-KEY': STIRLING_KEY },
          body: infoForm,
        });
        if (infoRes.ok) {
          const info = await infoRes.json() as { pages?: number; Pages?: number };
          totalPages = info.pages ?? info.Pages ?? 1;
        }
      } catch { /* ignore, on utilise 1 page par défaut */ }

      const pagesToProcess = Math.min(totalPages, MAX_PAGES);

      for (let page = 1; page <= pagesToProcess; page++) {
        const sf = new FormData();
        sf.append('fileInput', file);
        sf.append('imageFormat', 'png');
        sf.append('singleOrMultiple', 'single');  // ← PNG direct, pas ZIP
        sf.append('dpi', '200');
        sf.append('selectedPages', String(page));

        const stirRes = await fetch(`${STIRLING_URL}/api/v1/convert/pdf/img`, {
          method:  'POST',
          headers: { 'X-API-KEY': STIRLING_KEY },
          body:    sf,
        });

        if (!stirRes.ok) {
          const errBody = await stirRes.text().catch(() => '');
          throw new Error(`Stirling page ${page} — ${stirRes.status}: ${errBody.slice(0, 300)}`);
        }

        const contentType = stirRes.headers.get('content-type') ?? 'image/png';
        const imgBuffer = await stirRes.arrayBuffer();
        const b64 = arrayBufferToBase64(new Uint8Array(imgBuffer));
        images.push(`data:${contentType.split(';')[0]};base64,${b64}`);
      }

      if (images.length === 0) throw new Error('Stirling : aucune image générée');

    } else {
      // ── Image directe → base64 ─────────────────────────────────────────────
      const buf = await file.arrayBuffer();
      const b64 = arrayBufferToBase64(new Uint8Array(buf));
      images = [`data:${file.type};base64,${b64}`];
    }

    return json({ images }, 200);

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[pdf-to-images]', message);
    return json({ error: message }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function arrayBufferToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunk));
  }
  return btoa(binary);
}
