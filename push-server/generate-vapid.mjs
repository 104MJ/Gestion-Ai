// Génère les clés VAPID pour le serveur de rappels.
// Usage : node generate-vapid.mjs
import { webcrypto as crypto } from 'node:crypto';

const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify'
]);
const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
const b64u = b =>
  Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

console.log(
  '\n1) Clé publique (à coller dans l’appli → Réglages → Rappels, et en secret VAPID_PUBLIC) :\n'
);
console.log(b64u(pub));
console.log('\n2) Clé privée (secret VAPID_PRIVATE_JWK, ne la partage jamais) :\n');
console.log(JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d }));
console.log('');
