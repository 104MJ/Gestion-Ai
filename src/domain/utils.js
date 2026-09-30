/**
 * Petits outils génériques : couleurs, identifiants, échappement HTML, sommes.
 */

export const COLORS = [
  '#5b5bf0',
  '#f2994a',
  '#27ae60',
  '#eb5757',
  '#9b51e0',
  '#f2c94c',
  '#2d9cdb',
  '#e86fa8',
  '#16a085',
  '#8d8f99'
];

export const CURRENCIES = ['EUR', 'USD', 'CDF', 'XAF', 'GBP', 'CHF', 'CAD'];

export const pad = n => String(n).padStart(2, '0');

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const esc = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

export const sum = (arr, f = x => x) => arr.reduce((a, x) => a + (+f(x) || 0), 0);

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * Accorde un mot avec un nombre : plural(1, 'jour') → « 1 jour », plural(3, 'jour') → « 3 jours ».
 */
export const plural = (n, word, pluralWord = word + 's') => `${n} ${n > 1 ? pluralWord : word}`;
