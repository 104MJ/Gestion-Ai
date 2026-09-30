/**
 * Point hebdo : solde bancaire attendu comparé au solde réel.
 */
import { pad, sum } from './utils.js';
import { pd, today, dim, mkey, ym, addDays } from './dates.js';
import { S } from './state.js';
import { occurrences } from './subscriptions.js';

export function expectedBalance() {
  const a = S.anchor;
  if (!a) return null;
  const t = today();
  let bal = a.balance;
  const after = x => x.date > a.date || (x.date === a.date && (x.createdAt || x.ts || 0) > a.ts);
  S.transactions.forEach(x => {
    if (x.date <= t && after(x)) bal += x.type === 'income' ? x.amount : -x.amount;
  });
  S.subs.forEach(s => (bal -= occurrences(s, addDays(a.date, 1), t).length * s.price));
  for (let k = 0; ; k++) {
    const { y, m } = ym(a.date.slice(0, 7));
    const key = mkey(y, m + k);
    if (key > t.slice(0, 7)) break;
    S.fixed.forEach(f => {
      const { y: yy, m: mm2 } = ym(key);
      const d = `${key}-${pad(Math.min(f.day || 1, dim(yy, mm2)))}`;
      if (d > a.date && d <= t) bal -= f.amount;
    });
  }
  if (S.savingsSeparate !== false) {
    S.goals.forEach(g =>
      g.deposits.forEach(d => {
        if (d.date > a.date && d.date <= t) bal -= d.amount;
      })
    );
    S.vaults.forEach(v => {
      v.deposits.forEach(d => {
        if (d.date > a.date && d.date <= t) bal -= d.amount;
      });
      v.uses.forEach(u => {
        if (u.date > a.date && u.date <= t) bal += u.amount;
      });
    });
  }
  S.debts.forEach(d => {
    if (d.type === 'person' && d.date > a.date && d.date <= t) bal -= d.amount;
    (d.paid || []).forEach(p => {
      if (p.date > a.date && p.date <= t) bal += p.amount;
    });
  });
  return Math.round(bal * 100) / 100;
}

export const daysSinceCheck = () =>
  S.anchor ? Math.round((pd(today()) - pd(S.anchor.date)) / 864e5) : null;

export function checkDue() {
  const n = daysSinceCheck();
  return n == null || n >= 7 || (new Date().getDay() === 0 && n >= 1);
}

export function reliability() {
  const c = S.checks.slice(-8);
  if (!c.length) return null;
  return {
    n: c.length,
    ok: c.filter(x => Math.abs(x.diff) < 5).length,
    avg: sum(c, x => Math.abs(x.diff)) / c.length
  };
}
