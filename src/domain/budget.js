/**
 * Budget du mois : montant disponible par jour, série de jours tenus. Résultats mis en cache par mois.
 */
import { pad, sum } from './utils.js';
import { today, dim, ym, addDays, curKey } from './dates.js';
import { S, rev } from './state.js';
import { occurrences } from './subscriptions.js';
import { mod } from './modules.js';
import { vaultNeed } from './vaults.js';

export const cats = t => S.categories.filter(c => c.type === t);

export const getCat = id =>
  S.categories.find(c => c.id === id) || { name: 'Sans catégorie', icon: 'help', color: '#8d8f99' };

export function monthModel(key) {
  const { y, m } = ym(key);
  const days = dim(y, m);
  const from = `${key}-01`,
    to = `${key}-${pad(days)}`;
  const txs = S.transactions.filter(t => t.date.startsWith(key));
  const incomeTx = sum(
    txs.filter(t => t.type === 'income'),
    t => t.amount
  );
  const M = Math.max(S.income || 0, incomeTx);
  const F = sum(S.fixed, f => f.amount);
  const subDebits = [];
  S.subs.forEach(s =>
    occurrences(s, from, to).forEach(d => subDebits.push({ sub: s, date: d, amount: s.price }))
  );
  const A = sum(subDebits, d => d.amount);
  const E = S.savingsPlan || 0;
  const sm = S.createdAt.slice(0, 7) === key ? +S.createdAt.slice(8) : 1;
  const V = mod('vaults') ? sum(S.vaults, v => vaultNeed(v, key)) : 0;
  const Bfull = M - F - A - E - V;
  const B = sm > 1 ? (Bfull * (days - sm + 1)) / days : Bfull;
  const byDay = {},
    byDayList = {};
  txs
    .filter(t => t.type === 'expense' && !t.vault)
    .forEach(t => {
      const o = t.list || t.fromCheck ? byDayList : byDay;
      o[t.date] = (o[t.date] || 0) + t.amount;
    });
  const spent = sum(Object.values(byDay)) + sum(Object.values(byDayList));
  const t = today();
  const start = S.createdAt;
  const daysArr = [];
  let before = 0;
  for (let d = 1; d <= days; d++) {
    const date = `${key}-${pad(d)}`;
    const left = days - d + 1;
    const sp = byDay[date] || 0,
      spl = byDayList[date] || 0;
    if (d < sm) {
      daysArr.push({
        date,
        allow: 0,
        spent: sp + spl,
        before: 0,
        held: true,
        future: false,
        tracked: false
      });
      continue;
    }
    const allow = Math.max(0, (B - before) / left);
    daysArr.push({
      date,
      allow,
      spent: sp,
      listSpent: spl,
      before,
      held: sp <= allow + 0.005,
      future: date > t,
      tracked: date >= start
    });
    before += sp + spl;
  }
  const spentTracked = sum(
    daysArr.filter(x => x.tracked),
    x => x.spent + (x.listSpent || 0)
  );
  return {
    key,
    y,
    m,
    days,
    from,
    to,
    txs,
    M,
    incomeTx,
    F,
    A,
    E,
    V,
    B,
    Bfull,
    sm,
    spent,
    spentTracked,
    subDebits,
    daysArr
  };
}

const _mm = {};

export function mm(key) {
  void rev.value;
  return _mm[key] || (_mm[key] = monthModel(key));
}

export function invalidate() {
  Object.keys(_mm).forEach(k => delete _mm[k]);
  rev.value++;
}

export function todayInfo() {
  const M = mm(curKey());
  const d = new Date().getDate();
  const e = M.daysArr[d - 1];
  const leftToday = e.allow - e.spent;
  const daysLeftAfter = M.days - d;
  const tomorrow =
    daysLeftAfter > 0
      ? Math.max(0, (M.B - e.before - e.spent - (e.listSpent || 0)) / daysLeftAfter)
      : null;
  return {
    M,
    e,
    leftToday,
    tomorrow,
    daysLeft: M.days - d + 1,
    remainingMonth: M.B - M.spentTracked
  };
}

export function streak() {
  let n = 0,
    d = today();
  for (let i = 0; i < 400; i++) {
    if (d < S.createdAt) break;
    const e = mm(d.slice(0, 7)).daysArr[+d.slice(8) - 1];
    if (!e.held) break;
    n++;
    d = addDays(d, -1);
  }
  return n;
}
