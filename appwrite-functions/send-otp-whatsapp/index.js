/**
 * Appwrite Function: send-otp-whatsapp
 * Génère et envoie un OTP 6 chiffres via WhatsApp (whapi.cloud)
 *
 * Body attendu: { phone: "+22670000000" }
 * Retour: { success: true } ou { success: false, error: "..." }
 */
import { Client, Databases, ID, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.json({ success: false, error: 'Corps de requête invalide' }, 400);
  }

  const phone = body.phone;
  if (!phone) {
    return res.json({ success: false, error: 'Numéro de téléphone requis' }, 400);
  }

  // Normaliser le numéro (supprimer +, espaces)
  const normalizedPhone = phone.replace(/[\s+]/g, '');

  // Générer code OTP 6 chiffres
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'wimrux_finances';
  const COLLECTION_ID = 'otp_codes';
  const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
  const WHAPI_CHANNEL_ID = process.env.WHAPI_CHANNEL_ID || '';

  try {
    // Supprimer les anciens OTP pour ce téléphone
    try {
      const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
        Query.equal('phone', normalizedPhone),
      ]);
      for (const doc of existing.documents) {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, doc.$id);
      }
    } catch (e) {
      log('Cleanup OTP existants (optionnel):', e.message);
    }

    // Stocker le nouvel OTP
    await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
      phone: normalizedPhone,
      code,
      expires_at: expiresAt,
      used: false,
      created_at: new Date().toISOString(),
    });

    // Envoyer via whapi.cloud
    if (WHAPI_TOKEN) {
      const whapiResponse = await fetch(
        `https://gate.whapi.cloud/channels/${WHAPI_CHANNEL_ID}/messages/text`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WHAPI_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: `${normalizedPhone}@s.whatsapp.net`,
            body: `🔐 WIMRUX FINANCES\n\nVotre code de vérification : *${code}*\n\nValable 10 minutes. Ne le partagez pas.`,
          }),
        }
      );

      if (!whapiResponse.ok) {
        const whapiError = await whapiResponse.text();
        error('WhatsApp send error:', whapiError);
        // Ne pas retourner une erreur — le code est stocké, un admin peut le voir
      }
    } else {
      log('[WARN] WHAPI_TOKEN non configuré — OTP généré mais non envoyé. Code:', code);
    }

    return res.json({ success: true });
  } catch (err) {
    error('send-otp-whatsapp error:', err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
