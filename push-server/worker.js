/**
 * Serveur de rappels de l’appli budget (Cloudflare Worker, gratuit)
 *
 * Il ne reçoit AUCUNE donnée financière : seulement l'abonnement push du téléphone,
 * tes horaires de rappel, ton fuseau horaire et la date du dernier jour où tu as noté
 * quelque chose (pour ne pas te relancer si c'est déjà fait).
 *
 * Bindings attendus (wrangler.toml) :
 *   KV      : SUBS
 *   secrets : VAPID_PUBLIC (base64url, 65 octets), VAPID_PRIVATE_JWK (JSON), VAPID_SUBJECT (mailto:...)
 *   var     : ALLOWED_ORIGIN (ex. https://ton-pseudo.github.io) — "*" accepté
 */

const MESSAGES = {
  daily: {
    title: 'Tes dépenses du jour',
    body: 'Tu as dépensé quelque chose aujourd’hui ? Note-le en 5 secondes pour garder ton budget juste.',
    url: './#/?do=depense',
    tag: 'cap-daily'
  },
  weekly: {
    title: 'C’est l’heure du point hebdo',
    body: 'Ouvre ton appli bancaire et compare ton solde avec l’appli : 30 secondes pour une semaine sans écart.',
    url: './#/?do=point',
    tag: 'cap-weekly'
  },
  test: {
    title: 'Rappels',
    body: 'Les rappels fonctionnent. À ce soir !',
    url: './',
    tag: 'cap-test'
  }
};

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const json = (o, s = 200) =>
      new Response(JSON.stringify(o), {
        status: s,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    if (req.method !== 'POST') return json({ ok: true, service: 'cap-rappels' });
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'json' }, 400);
    }
    const id = String(body.id || '');
    if (!/^[a-z0-9]{10,40}$/i.test(id)) return json({ error: 'id' }, 400);
    const key = `sub:${id}`;
    const path = new URL(req.url).pathname;
    const cur = JSON.parse((await env.SUBS.get(key)) || 'null');

    if (path === '/subscribe') {
      if (!body.subscription || !body.subscription.endpoint || !body.subscription.keys)
        return json({ error: 'subscription' }, 400);
      const rec = {
        ...(cur || {}),
        subscription: body.subscription,
        tz: body.tz || 'Europe/Paris',
        daily: body.daily,
        weekly: body.weekly
      };
      await env.SUBS.put(key, JSON.stringify(rec));
      return json({ ok: true });
    }
    if (!cur) return json({ error: 'unknown' }, 404);
    if (path === '/prefs') {
      Object.assign(cur, { tz: body.tz || cur.tz, daily: body.daily, weekly: body.weekly });
      await env.SUBS.put(key, JSON.stringify(cur));
      return json({ ok: true });
    }
    if (path === '/ping') {
      if (body.logged) cur.lastLog = body.logged;
      if (body.checked) cur.lastCheck = body.checked;
      await env.SUBS.put(key, JSON.stringify(cur));
      return json({ ok: true });
    }
    if (path === '/unsubscribe') {
      await env.SUBS.delete(key);
      return json({ ok: true });
    }
    if (path === '/test') {
      const r = await sendPush(cur.subscription, MESSAGES.test, env);
      return json({ ok: r.ok, status: r.status });
    }
    return json({ error: 'route' }, 404);
  },

  async scheduled(event, env, ctx) {
    let cursor;
    do {
      const page = await env.SUBS.list({ prefix: 'sub:', cursor });
      for (const k of page.keys) ctx.waitUntil(handle(k.name, env));
      cursor = page.list_complete ? null : page.cursor;
    } while (cursor);
  }
};

/* ---------- logique des rappels ---------- */
function localNow(tz) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hourCycle: 'h23'
    })
      .formatToParts(new Date())
      .map(x => [x.type, x.value])
  );
  const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday];
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: +p.hour * 60 + +p.minute, weekday: wd };
}
const toMin = t => {
  const [h, m] = String(t || '21:00')
    .split(':')
    .map(Number);
  return h * 60 + (m || 0);
};
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
// envoie si l'heure est passée depuis moins d'1 h (le cron tourne toutes les 15 min)
const inWindow = (now, t) => now.minutes >= toMin(t) && now.minutes < toMin(t) + 60;

export async function decide(rec, now) {
  const out = [];
  if (
    rec.daily &&
    rec.daily.on &&
    inWindow(now, rec.daily.time) &&
    rec.lastDaily !== now.date &&
    rec.lastLog !== now.date
  )
    out.push('daily');
  if (
    rec.weekly &&
    rec.weekly.on &&
    now.weekday === +rec.weekly.day &&
    inWindow(now, rec.weekly.time) &&
    rec.lastWeekly !== now.date &&
    !(rec.lastCheck && daysBetween(rec.lastCheck, now.date) < 5)
  )
    out.push('weekly');
  return out;
}

async function handle(key, env) {
  const rec = JSON.parse((await env.SUBS.get(key)) || 'null');
  if (!rec) return;
  const now = localNow(rec.tz || 'Europe/Paris');
  const todo = await decide(rec, now);
  if (!todo.length) return;
  for (const kind of todo) {
    const r = await sendPush(rec.subscription, MESSAGES[kind], env);
    if (r.status === 404 || r.status === 410) {
      await env.SUBS.delete(key);
      return;
    }
    if (kind === 'daily') rec.lastDaily = now.date;
    else rec.lastWeekly = now.date;
  }
  await env.SUBS.put(key, JSON.stringify(rec));
}

/* ---------- Web Push : VAPID (RFC 8292) + chiffrement aes128gcm (RFC 8291) ---------- */
const enc = new TextEncoder();
const b64u = buf =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const unb64u = s => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
};
const concat = (...arrs) => {
  const n = arrs.reduce((a, x) => a + x.length, 0);
  const o = new Uint8Array(n);
  let i = 0;
  for (const x of arrs) {
    o.set(x, i);
    i += x.length;
  }
  return o;
};

export async function vapidJWT(endpoint, env) {
  const aud = new URL(endpoint).origin;
  const header = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64u(
    enc.encode(
      JSON.stringify({
        aud,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: env.VAPID_SUBJECT || 'mailto:cap@example.com'
      })
    )
  );
  const key = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(env.VAPID_PRIVATE_JWK),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(`${header}.${payload}`)
  );
  return `${header}.${payload}.${b64u(sig)}`;
}

async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8)
  );
}

export async function encryptPayload(subscription, text) {
  const uaPublic = unb64u(subscription.keys.p256dh);
  const authSecret = unb64u(subscription.keys.auth);
  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits'
  ]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const ecdh = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256)
  );
  const ikm = await hkdf(
    authSecret,
    ecdh,
    concat(enc.encode('WebPush: info\0'), uaPublic, asPublic),
    32
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aes,
      concat(enc.encode(text), new Uint8Array([2]))
    )
  );
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ct);
}

export async function sendPush(subscription, message, env) {
  const body = await encryptPayload(subscription, JSON.stringify(message));
  const jwt = await vapidJWT(subscription.endpoint, env);
  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      TTL: '43200',
      Urgency: 'normal',
      Topic: message.tag,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC}`
    },
    body
  });
}
