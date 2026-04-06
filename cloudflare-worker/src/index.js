export default {
  async fetch(request) {
    const WHATSAPP_NUMBER = '6285931504125';

    const url = new URL(request.url);
    const message = url.searchParams.get('message');

    if (!message) {
      return new Response('Parameter message wajib diisi', { status: 400 });
    }

    const waUrl = `https://api.whatsapp.com/send/?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;
    return Response.redirect(waUrl, 302);
  },
};
