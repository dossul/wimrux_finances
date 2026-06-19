/**
 * Edge Function: delete-user
 * Supprime des utilisateurs de auth.users via l'API Appwrite
 *
 * Usage: POST /functions/delete-user
 * Body: { user_ids: string[] }
 *
 * Requires: APPWRITE_ENDPOINT, APPWRITE_PROJECT, APPWRITE_API_KEY env vars
 */

const APPWRITE_ENDPOINT = Deno.env.get('APPWRITE_ENDPOINT') || 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT = Deno.env.get('APPWRITE_PROJECT') || '6a29285200015cd421c7';
const APPWRITE_API_KEY = Deno.env.get('APPWRITE_API_KEY') || '';

module.exports = async function (request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { user_ids } = body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'user_ids array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const results = [];
    for (const userId of user_ids) {
      const res = await fetch(`${APPWRITE_ENDPOINT}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': APPWRITE_PROJECT,
          'X-Appwrite-Key': APPWRITE_API_KEY
        }
      });
      results.push({ userId, status: res.status, ok: res.status === 204 || res.status === 200 });
    }

    const allOk = results.every(r => r.ok);

    return new Response(JSON.stringify({
      success: allOk,
      message: `${results.filter(r => r.ok).length}/${user_ids.length} utilisateur(s) supprimé(s)`,
      deleted: results
    }), {
      status: allOk ? 200 : 207,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in delete-user function:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
