import type { APIRoute } from 'astro';

// MailerLite — grupo "Noticias" (suscripciones desde news.automalia.ai)
const GROUP_ID = '190959407708767549';

export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' };

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400, headers });
  }

  const email = body.email?.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return new Response(JSON.stringify({ error: 'Email inválido' }), { status: 400, headers });
  }

  const apiKey = import.meta.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    console.error('MAILERLITE_API_KEY no configurada');
    return new Response(JSON.stringify({ error: 'Error de configuración del servidor' }), { status: 500, headers });
  }

  try {
    const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, groups: [GROUP_ID] }),
    });

    // MailerLite hace upsert: 200/201 tanto en alta nueva como en suscriptor existente.
    if (res.ok) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    const data = await res.json().catch(() => ({}));
    console.error('Error MailerLite:', res.status, data);
    return new Response(JSON.stringify({ error: 'No se pudo completar la suscripción' }), { status: 502, headers });
  } catch (err) {
    console.error('Error red MailerLite:', err);
    return new Response(JSON.stringify({ error: 'Error de conexión' }), { status: 500, headers });
  }
};
