/**
 * État global réactif de l'appli, valeurs par défaut et normalisation des données chargées.
 */
import { reactive, ref, watch } from 'vue';
import { COLORS } from './utils.js';
import { today } from './dates.js';
import { invalidate } from './budget.js';

export const S = reactive({});

export const photos = reactive({});

export const rev = ref(0);

export function baseState() {
  const c = (id, type, name, ic, color) => ({ id, type, name, icon: ic, color, budget: 0 });
  return {
    version: 1,
    onboarded: false,
    name: '',
    currency: 'EUR',
    createdAt: today(),
    income: 0,
    savingsPlan: 0,
    fixed: [],
    goals: [],
    activeGoalId: null,
    categories: [
      c('c-food', 'expense', 'Courses', 'cart', COLORS[0]),
      c('c-resto', 'expense', 'Restos & cafés', 'utensils', COLORS[1]),
      c('c-transport', 'expense', 'Transport', 'bus', COLORS[6]),
      c('c-fun', 'expense', 'Sorties & loisirs', 'ticket', COLORS[7]),
      c('c-shop', 'expense', 'Shopping', 'bag', COLORS[5]),
      c('c-health', 'expense', 'Santé & beauté', 'health', COLORS[2]),
      c('c-home', 'expense', 'Maison', 'home', COLORS[4]),
      c('c-other', 'expense', 'Autre', 'box', COLORS[9]),
      c('i-salary', 'income', 'Salaire', 'briefcase', COLORS[2]),
      c('i-aid', 'income', 'Aides & bourse', 'grad', COLORS[6]),
      c('i-other', 'income', 'Autre revenu', 'wallet', COLORS[8])
    ],
    transactions: [],
    subs: [],
    envies: [],
    closedMonths: {},
    groceries: { items: [], lists: {} },
    vaults: [],
    debts: [],
    checks: [],
    anchor: null,
    savingsSeparate: true,
    modules: { courses: true, envies: true, vaults: true, debts: false, check: true }
  };
}

export function normalize(d) {
  const b = baseState();
  if (!d || typeof d !== 'object') return b;
  const o = Object.assign(b, d);
  ['fixed', 'goals', 'transactions', 'subs', 'envies', 'categories'].forEach(k => {
    if (!Array.isArray(o[k])) o[k] = b[k];
  });
  if (!o.categories.length) o.categories = baseState().categories;
  o.closedMonths = o.closedMonths && typeof o.closedMonths === 'object' ? o.closedMonths : {};
  o.goals.forEach(g => {
    if (!Array.isArray(g.deposits)) g.deposits = [];
  });
  o.subs.forEach(s => {
    if (!Array.isArray(s.uses)) s.uses = [];
  });
  if (!o.groceries || typeof o.groceries !== 'object') o.groceries = { items: [], lists: {} };
  if (!Array.isArray(o.groceries.items)) o.groceries.items = [];
  if (!o.groceries.lists) o.groceries.lists = {};
  ['vaults', 'debts', 'checks'].forEach(k => {
    if (!Array.isArray(o[k])) o[k] = [];
  });
  o.vaults.forEach(v => {
    if (!Array.isArray(v.deposits)) v.deposits = [];
    if (!Array.isArray(v.uses)) v.uses = [];
  });
  o.modules = Object.assign(
    { courses: true, envies: true, vaults: true, debts: false, check: true },
    o.modules || {}
  );
  o.income = +o.income || 0;
  o.savingsPlan = +o.savingsPlan || 0;
  return o;
}

export const DEFAULT_ART =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1f4b"/><stop offset=".45" stop-color="#7a4b8f"/><stop offset=".7" stop-color="#f08a5d"/><stop offset="1" stop-color="#f7c873"/></linearGradient><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3a86b"/><stop offset="1" stop-color="#2a2c55"/></linearGradient></defs><rect width="400" height="800" fill="url(#s)"/><circle cx="220" cy="520" r="70" fill="#ffd89a" opacity=".95"/><path d="M0 520 L60 470 L120 505 L190 440 L260 500 L320 460 L400 505 L400 800 L0 800Z" fill="#3b2e5a" opacity=".85"/><path d="M0 560 L80 520 L150 555 L230 510 L310 550 L400 525 L400 800 L0 800Z" fill="#241f3f"/><rect y="590" width="400" height="210" fill="url(#w)" opacity=".9"/><path d="M150 620h140M175 650h90M195 680h50" stroke="#ffe2b0" stroke-width="4" stroke-linecap="round" opacity=".7"/></svg>`
  );

export const goalPhoto = g => (g && g.photoId && photos[g.photoId]) || DEFAULT_ART;

export function replaceState(obj) {
  const n = normalize(obj);
  Object.keys(S).forEach(k => {
    delete S[k];
  });
  Object.assign(S, n);
  invalidate();
}

Object.assign(S, baseState());
// Toute modification de l'état invalide le cache des calculs mensuels.
watch(S, () => invalidate(), { deep: true, flush: 'sync' });
