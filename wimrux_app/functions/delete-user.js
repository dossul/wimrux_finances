/**
 * Edge Function: delete-user
 * Supprime des utilisateurs de auth.users
 * 
 * Usage: POST /functions/delete-user
 * Body: { user_ids: string[] }
 * 
 * Note: Cette fonction utilise les privilèges du runtime Deno
 * qui a un accès admin à l'API interne.
 */

const INSFORGE_URL = Deno.env.get('INSFORGE_URL') || 'https://gfe4bd9y.eu-central.insforge.app';
const INSFORGE_ADMIN_KEY = Deno.env.get('INSFORGE_ADMIN_KEY') || Deno.env.get('INSFORGE_ANON_KEY') || '';

module.exports = async function(request) {
  // Vérifier la méthode
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Récupérer le body
    const body = await request.json();
    const { user_ids } = body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'user_ids array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Utiliser l'API interne avec les privilèges du runtime
    const deleteResponse = await fetch(`${INSFORGE_URL}/api/auth/users`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${INSFORGE_ADMIN_KEY}`
      },
      body: JSON.stringify({ userIds: user_ids })
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: 'Delete failed', message: errorText };
      }
      return new Response(JSON.stringify({ 
        error: errorData.error || 'Delete failed',
        message: errorData.message || 'Could not delete users',
        statusCode: deleteResponse.status
      }), {
        status: deleteResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await deleteResponse.json();

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${user_ids.length} utilisateur(s) supprimé(s)`,
      deleted: result
    }), {
      status: 200,
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
