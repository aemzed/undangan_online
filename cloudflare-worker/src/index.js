export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);
    const message = url.searchParams.get('message');

    if (!message) {
      return new Response(JSON.stringify({ error: 'Parameter "message" wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const waUrl = `https://api.whatsapp.com/send/?phone=${env.WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;

    return Response.redirect(waUrl, 302);
  },
};
