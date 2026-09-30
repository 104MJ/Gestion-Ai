/**
 * Actions partagées entre les écrans : versement au rêve, enregistrement d'une
 * opération, rappels (ping du serveur), exports.
 */
import { APP_NAME } from './config.js';
import {
  S,
  uid,
  today,
  money,
  money0,
  activeGoal,
  revealOf,
  penalty,
  clamp,
  impact,
  todayInfo,
  getCat,
  mod
} from './domain/model.js';
import { useUI } from './stores/ui.js';
import { useData } from './stores/data.js';
import { shareFile } from './utils/files.js';

export function deposit(amount, note, kind) {
  const ui = useUI();
  const g = activeGoal();
  if (!g) return;
  ui.revealFrom = clamp(revealOf(g) - penalty().p, 0, 1);
  g.deposits.push({ id: uid(), date: today(), amount: Math.round(amount * 100) / 100, note, kind });
  ui.close();
  const r = revealOf(g);
  ui.toast(
    `+${money(amount)} vers « ${g.name} »`,
    r >= 1
      ? 'Rêve atteint : la photo est entièrement révélée.'
      : `Photo révélée à ${Math.round(r * 100)} %`
  );
}

export function toastForExpense(rec, amount) {
  const ui = useUI();
  const T = todayInfo();
  ui.toast(
    `−${money(amount)}`,
    rec.date === today() && T.M.B > 0
      ? T.leftToday >= 0
        ? `Il te reste ${money0(T.leftToday)} aujourd’hui · ${impact(amount)}`
        : impact(amount)
      : impact(amount)
  );
}

/* ---------- rappels ---------- */
export function pushCfg() {
  if (!S.push || !S.push.daily || !S.push.weekly || S.push.server === undefined)
    S.push = Object.assign(
      {
        id: null,
        server: '',
        vapid: '',
        on: false,
        daily: { on: true, time: '21:00' },
        weekly: { on: true, day: 0, time: '18:00' }
      },
      S.push || {}
    );
  return S.push;
}
export async function pushPost(path, body) {
  const P = pushCfg();
  if (!P.on || !P.server || !P.id) return null;
  try {
    const r = await fetch(P.server.replace(/\/$/, '') + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: P.id, ...body }),
      keepalive: true
    });
    return r.ok ? r.json() : null;
  } catch (e) {
    return null;
  }
}
export const pushPing = o => {
  pushPost('/ping', o);
};
export const pushPrefs = () => {
  const P = pushCfg();
  pushPost('/prefs', {
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    daily: P.daily,
    weekly: P.weekly
  });
};

/* ---------- exports ---------- */
export function exportCSV() {
  const ui = useUI();
  if (!S.transactions.length) return ui.toast('Aucune opération à exporter');
  const q = v => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const L = [['Date', 'Type', 'Catégorie', 'Montant', 'Devise', 'Note'].join(';')];
  S.transactions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(t =>
      L.push(
        [
          t.date,
          t.type === 'income' ? 'Revenu' : 'Dépense',
          getCat(t.categoryId).name,
          (t.type === 'income' ? t.amount : -t.amount).toFixed(2).replace('.', ','),
          S.currency,
          t.note
        ]
          .map(q)
          .join(';')
      )
    );
  shareFile(
    `${APP_NAME.toLowerCase()}-operations-${today()}.csv`,
    '﻿' + L.join('\r\n'),
    'text/csv'
  );
}
export function backup() {
  const data = useData();
  shareFile(
    `${APP_NAME.toLowerCase()}-sauvegarde-${today()}.json`,
    JSON.stringify({ app: 'cap', data: JSON.parse(JSON.stringify(S)), photos: { ...data.photos } }),
    'application/json'
  );
}
export { mod };
