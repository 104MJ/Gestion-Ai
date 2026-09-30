/**
 * Dates au format YYYY-MM-DD et libellés en français.
 */
import { pad } from './utils.js';

export const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const pd = s => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const today = () => ds(new Date());

export const dim = (y, m) => new Date(y, m + 1, 0).getDate();

export const mkey = (y, m) => {
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const ym = k => {
  const [y, m] = k.split('-').map(Number);
  return { y, m: m - 1 };
};

export const addDays = (s, n) => {
  const d = pd(s);
  d.setDate(d.getDate() + n);
  return ds(d);
};

export const curKey = () => today().slice(0, 7);

export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export const monthName = k => {
  const { y, m } = ym(k);
  return cap(new Date(y, m, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
};

export const dayShort = s =>
  pd(s)
    .toLocaleDateString(
      'fr-FR',
      s.slice(0, 4) === today().slice(0, 4)
        ? { day: 'numeric', month: 'short' }
        : { day: 'numeric', month: 'short', year: 'numeric' }
    )
    .replace('.', '');

export const dayLong = s => {
  if (s === today()) return 'Aujourd’hui';
  if (s === addDays(today(), -1)) return 'Hier';
  if (s === addDays(today(), 1)) return 'Demain';
  return pd(s).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

export const monthsBetween = (a, b) => {
  const A = ym(a),
    B = ym(b);
  return (B.y - A.y) * 12 + (B.m - A.m);
};
