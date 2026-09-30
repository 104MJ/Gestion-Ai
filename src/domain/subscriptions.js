/**
 * Abonnements : dates de prélèvement, coût mensuel, usage et verdict.
 */
import { pad } from './utils.js';
import { pd, today, dim, addDays } from './dates.js';
import { S } from './state.js';

export const FREQ = { week: 'semaine', month: 'mois', year: 'an' };

export function addPeriod(start, k, freq) {
  const [y, m, d] = start.split('-').map(Number);
  if (freq === 'week') return addDays(start, 7 * k);
  if (freq === 'year') {
    const yy = y + k;
    return `${yy}-${pad(m)}-${pad(Math.min(d, dim(yy, m - 1)))}`;
  }
  const t = new Date(y, m - 1 + k, 1);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(Math.min(d, dim(t.getFullYear(), t.getMonth())))}`;
}

export function occurrences(s, from, to) {
  const out = [];
  const end = s.cancelledAt && s.cancelledAt <= to ? addDays(s.cancelledAt, -1) : to;
  for (let k = 0; k < 3000; k++) {
    const d = addPeriod(s.startDate, k, s.freq);
    if (d > end) break;
    if (d >= from) out.push(d);
  }
  return out;
}

export const nextDebit = s => {
  if (s.cancelledAt) return null;
  for (let k = 0; k < 3000; k++) {
    const d = addPeriod(s.startDate, k, s.freq);
    if (d >= today()) return d;
  }
  return null;
};

export const monthlyEq = s =>
  s.freq === 'week' ? (s.price * 52) / 12 : s.freq === 'year' ? s.price / 12 : s.price;

export const paidSoFar = s => occurrences(s, s.startDate, today()).length * s.price;

export const usesSince = (s, days) => {
  const from = addDays(today(), -days);
  return s.uses.filter(u => u >= from).length;
};

export const activeSubs = () => S.subs.filter(s => !s.cancelledAt);

export function verdictOf(s) {
  if (s.cancelledAt) return { k: 'cancelled', t: 'Résilié' };
  if (s.verdict === 'keep') return { k: 'keep', t: 'À garder' };
  if (s.verdict === 'question') return { k: 'question', t: 'À questionner' };
  if (s.verdict === 'cancel') return { k: 'cancel', t: 'À résilier' };
  const age = (pd(today()) - pd(s.startDate)) / 864e5;
  if (s.usage === 'never' || (age > 30 && usesSince(s, 30) === 0))
    return { k: 'suggest', t: 'Peu utilisé ?' };
  return { k: 'none', t: 'À évaluer' };
}
