/**
 * Appwrite Function: verify-otp
 * Vérifie un code OTP soumis par l'utilisateur
 *
 * Body attendu: { code: "123456" }
 * Contexte: L'utilisateur est déjà authentifié (session Appwrite active)
 *           → on récupère son téléphone depuis user_profiles
 * Retour: { success: true } ou { success: false, error: "..." }
 */
import { Client, Databases, Account, Query } from 'node-appwrite';

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

  const { code } = body;
  if (!code || !/^\d{6}$/.test(code)) {
    return res.json({ success: false, error: 'Code OTP invalide (6 chiffres requis)' }, 400);
  }

  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'wimrux_finances';

  try {
    // Récupérer le téléphone de l'utilisateur depuis son JWT (si disponible)
    // Sinon, chercher l'OTP le plus récent non utilisé avec ce code
    let phoneFilter = null;

    // Tenter de récupérer le profil utilisateur via userId du JWT
    const userId = req.headers['x-appwrite-user-id'] || null;
    if (userId) {
      try {
        const profiles = await databases.listDocuments(DATABASE_ID, 'user_profiles', [
          Query.equal('user_id', userId),
          Query.limit(1),
        ]);
        if (profiles.documents.length > 0) {
          const profile = profiles.documents[0];
          if (profile.phone) {
            phoneFilter = profile.phone.replace(/[\s+]/g, '');
          }
        }
      } catch (e) {
        log('Impossible de récupérer le profil utilisateur:', e.message);
      }
    }

    // Chercher l'OTP correspondant
    const filters = [
      Query.equal('code', code),
      Query.equal('used', false),
      Query.greaterThan('expires_at', new Date().toISOString()),
      Query.orderDesc('$createdAt'),
      Query.limit(1),
    ];
    if (phoneFilter) {
      filters.push(Query.equal('phone', phoneFilter));
    }

    const otpDocs = await databases.listDocuments(DATABASE_ID, 'otp_codes', filters);

    if (otpDocs.documents.length === 0) {
      return res.json({ success: false, error: 'Code invalide ou expiré' }, 401);
    }

    const otpDoc = otpDocs.documents[0];

    // Marquer le code comme utilisé
    await databases.updateDocument(DATABASE_ID, 'otp_codes', otpDoc.$id, {
      used: true,
    });

    log('OTP vérifié avec succès pour phone:', otpDoc.phone);
    return res.json({ success: true });

  } catch (err) {
    error('verify-otp error:', err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
