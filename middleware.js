/* AutoBiz Academy — controle d'acces a l'espace membre.
   Un seul fichier : il sert la connexion, la deconnexion, et ferme
   la formation ET ses fichiers (videos, PDF). Un lien direct vers une
   video ne donne plus rien sans session valide. */
import { next } from '@vercel/edge';

/* Cle de signature : definie UNIQUEMENT dans les variables d'environnement Vercel
   (AUTOBIZ_SECRET). Rien de secret n'est stocke dans ce depot.
   Si elle manque, tout reste ferme : on n'ouvre jamais par defaut. */
const SECRET = process.env.AUTOBIZ_SECRET || '';

const SHEET_API = process.env.AUTOBIZ_SHEET_API
  || 'https://script.google.com/macros/s/AKfycbybiIStwFkD8pUvqdn5D_lWatJ-ONbWaiZT91aN1tr_501xWU3Ej4h_VRVzcNgkfnR5/exec';

const COOKIE = 'abz_session';
const JOURS = 30;

/* ---------- ce qui est ferme ---------- */
function estProtege(p) {
  if (p === '/formation' || p === '/formation.html') return true;
  if (p === '/organigramme-clim.html') return true;
  return /\.(mp4|pdf)$/i.test(p);
}

/* ---------- outils ---------- */
const enc = new TextEncoder();

function b64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signer(payload) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payload))));
}

function cookieDe(req) {
  const brut = req.headers.get('cookie') || '';
  const m = brut.match(/(?:^|;\s*)abz_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Rend l'email si la session est valide, sinon null. */
async function membre(req) {
  if (!SECRET) return null;                 // cle absente : acces refuse
  const jeton = cookieDe(req);
  if (!jeton) return null;
  const parts = jeton.split('.');
  if (parts.length !== 2) return null;
  if (await signer(parts[0]) !== parts[1]) return null;   // signature falsifiee
  try {
    const clair = atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));
    const bout = clair.split('|');
    const exp = Number(bout[1]);
    if (!exp || Date.now() >= exp) return null;            // session expiree
    return bout[0];
  } catch (e) {
    return null;
  }
}

function json(obj, init) {
  return new Response(JSON.stringify(obj), Object.assign(
    { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
    init || {}
  ));
}

/* ---------- connexion ---------- */
async function connexion(req) {
  if (req.method !== 'POST') return json({ ok: false, erreur: 'methode' }, { status: 405 });
  if (!SECRET) return json({ ok: false, erreur: 'Site en cours de configuration.' }, { status: 503 });

  let b = {};
  try { b = await req.json(); } catch (e) { b = {}; }

  const email = String(b.email || '').trim().toLowerCase();
  const code = String(b.code || '').trim();
  if (!email || !code) return json({ ok: false, erreur: 'Email et code obligatoires.' }, { status: 400 });

  let rep;
  try {
    const r = await fetch(SHEET_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'login', email: email, code: code })
    });
    rep = await r.json();
  } catch (e) {
    return json({ ok: false, erreur: 'Verification indisponible, reessaie dans un instant.' }, { status: 502 });
  }

  if (!rep || !rep.ok) return json({ ok: false, erreur: 'Email ou code incorrect.' }, { status: 401 });

  const exp = Date.now() + JOURS * 24 * 3600 * 1000;
  const payload = b64url(enc.encode(email + '|' + exp));
  const jeton = payload + '.' + (await signer(payload));

  return json({ ok: true, nom: rep.nom || '' }, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Set-Cookie': COOKIE + '=' + jeton +
        '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + (JOURS * 24 * 3600)
    }
  });
}

/* ---------- point d'entree ---------- */
export default async function middleware(req) {
  const url = new URL(req.url);
  const p = url.pathname.toLowerCase();

  if (p === '/api/login') return connexion(req);

  if (p === '/api/me') {
    const email = await membre(req);
    return json(email ? { ok: true, email: email } : { ok: false });
  }

  if (p === '/api/logout') {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/',
        'Set-Cookie': COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
      }
    });
  }

  if (!estProtege(p)) return next();
  if (await membre(req)) return next();

  const vers = new URL('/', url);
  vers.searchParams.set('suite', url.pathname);
  return Response.redirect(vers, 302);
}
