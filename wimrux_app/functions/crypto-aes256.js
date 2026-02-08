const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY = process.env.AES_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef'; // 32 bytes

module.exports = async function(request) {
  // CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const body = await request.json();
    const { action, data } = body;

    if (!action || !data) {
      return new Response(JSON.stringify({ error: 'action and data required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (action === 'encrypt') {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY, 'utf8'), iv);
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const result = iv.toString('base64') + ':' + encrypted;

      return new Response(JSON.stringify({ ciphertext: result }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (action === 'decrypt') {
      const parts = data.split(':');
      if (parts.length !== 2) {
        return new Response(JSON.stringify({ error: 'Invalid ciphertext format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      const iv = Buffer.from(parts[0], 'base64');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY, 'utf8'), iv);
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return new Response(JSON.stringify({ plaintext: decrypted }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use encrypt or decrypt' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
};
