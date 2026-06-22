import type { APIRoute } from 'astro';

// Origen del lead — segmenta news vs tuto vía referrer_url.
// Nota: los tags de Buttondown requieren plan Basic; usamos referrer_url
// (disponible en plan free) para distinguir el origen de cada suscriptor.
const REFERRER = 'https://news.automalia.ai';

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

  const apiKey = import.meta.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    console.error('BUTTONDOWN_API_KEY no configurada');
    return new Response(JSON.stringify({ error: 'Error de configuración del servidor' }), { status: 500, headers });
  }

  try {
    const res = await fetch('https://api.buttondown.email/v1/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: email,
        referrer_url: REFERRER,
      }),
    });

    if (res.ok) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    // Suscriptor ya existente — Buttondown devuelve 400. Tratar como éxito suave.
    const data = await res.json().catch(() => ({}));
    const detail = JSON.stringify(data).toLowerCase();
    if (res.status === 400 && detail.includes('already')) {
      return new Response(JSON.stringify({ ok: true, already: true }), { status: 200, headers });
    }

    console.error('Error Buttondown:', res.status, data);
    return new Response(JSON.stringify({ error: 'No se pudo completar la suscripción' }), { status: 502, headers });
  } catch (err) {
    console.error('Error red Buttondown:', err);
    return new Response(JSON.stringify({ error: 'Error de conexión' }), { status: 500, headers });
  }
};
