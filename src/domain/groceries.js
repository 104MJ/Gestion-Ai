/**
 * Courses : produits habituels, grande course du mois et listes par semaine.
 */
import { pad, uid, sum } from './utils.js';
import { today, dim, ym, curKey, monthName, dayShort } from './dates.js';
import { S } from './state.js';
import { money0 } from './money.js';
import { mm } from './budget.js';

export const AISLES = [
  'Fruits & légumes',
  'Frais',
  'Viande & poisson',
  'Épicerie',
  'Boissons',
  'Surgelés',
  'Hygiène',
  'Maison',
  'Autre'
];

export const GROC_CAT = 'c-food';

export function gState() {
  if (!S.groceries || typeof S.groceries !== 'object') S.groceries = { items: [], lists: {} };
  if (!Array.isArray(S.groceries.items)) S.groceries.items = [];
  if (!S.groceries.lists || typeof S.groceries.lists !== 'object') S.groceries.lists = {};
  return S.groceries;
}

export function starterItems() {
  const it = (name, aisle, rhythm, price, qty = 1) => ({
    id: uid(),
    name,
    aisle,
    rhythm,
    price,
    qty
  });
  return [
    it('Riz (1 kg)', 'Épicerie', 'month', 2.2),
    it('Pâtes', 'Épicerie', 'month', 1, 3),
    it('Huile de tournesol', 'Épicerie', 'month', 2.8),
    it('Farine', 'Épicerie', 'month', 1.1),
    it('Sucre', 'Épicerie', 'month', 1.3),
    it('Épices & bouillons', 'Épicerie', 'month', 3),
    it('Conserves (tomates, haricots)', 'Épicerie', 'month', 1.5, 3),
    it('Café / thé', 'Boissons', 'month', 4.5),
    it('Lessive', 'Maison', 'month', 7.9),
    it('Liquide vaisselle', 'Maison', 'month', 1.8),
    it('Papier toilette', 'Hygiène', 'month', 4.2),
    it('Gel douche', 'Hygiène', 'month', 3.5),
    it('Dentifrice', 'Hygiène', 'month', 2.2),
    it('Légumes de saison', 'Fruits & légumes', 'week', 8),
    it('Fruits', 'Fruits & légumes', 'week', 6),
    it('Oignons & ail', 'Fruits & légumes', 'week', 2),
    it('Lait', 'Frais', 'week', 1.2, 2),
    it('Œufs (x12)', 'Frais', 'week', 3.6),
    it('Yaourts', 'Frais', 'week', 2.5),
    it('Fromage', 'Frais', 'week', 3.2),
    it('Pain', 'Épicerie', 'week', 1.5, 2),
    it('Poulet', 'Viande & poisson', 'week', 7.5),
    it('Poisson', 'Viande & poisson', 'week', 6.5)
  ];
}

export const lineTotal = i => i.price * (i.qty || 1);

export const listEstimate = L => sum(L.items, lineTotal);

export const basketOf = L =>
  sum(
    L.items.filter(i => i.checked),
    lineTotal
  );

export const plannedBought = L =>
  L.items.some(i => i.checked)
    ? sum(
        L.items.filter(i => i.checked && !i.offList),
        lineTotal
      )
    : listEstimate(L);

export const monthPlanned = () =>
  sum(
    gState().items.filter(i => i.rhythm === 'month'),
    lineTotal
  );

export const groceryBudget = () => (S.categories.find(c => c.id === GROC_CAT) || {}).budget || 0;

export function weeksOf(key) {
  const { y, m } = ym(key);
  const days = dim(y, m);
  const out = [];
  for (let w = 0; w < 4; w++) {
    const a = w * 7 + 1,
      b = w === 3 ? days : a + 6;
    out.push({
      n: w + 1,
      key: `${key}:W${w + 1}`,
      from: `${key}-${pad(a)}`,
      to: `${key}-${pad(b)}`,
      days: b - a + 1
    });
  }
  return out;
}

export const currentWeek = () =>
  weeksOf(curKey())[Math.min(3, Math.floor((+today().slice(8) - 1) / 7))];

export function getList(key, create) {
  const G = gState();
  if (!G.lists[key] && create) {
    const rh = key.endsWith(':M') ? 'month' : 'week';
    G.lists[key] = {
      items: G.items
        .filter(i => i.rhythm === rh)
        .map(i => ({
          id: uid(),
          itemId: i.id,
          name: i.name,
          aisle: i.aisle,
          price: i.price,
          qty: i.qty || 1,
          checked: false,
          offList: false
        })),
      done: false,
      ticket: 0,
      txId: null
    };
  }
  return G.lists[key] || null;
}

export function groceryMonth(key) {
  const M = mm(key);
  const budget = groceryBudget();
  const mList = getList(`${key}:M`);
  const planM = mList ? (mList.done ? mList.ticket : listEstimate(mList)) : monthPlanned();
  const fresh = Math.max(0, budget - planM);
  const tx = M.txs.filter(t => t.type === 'expense' && t.categoryId === GROC_CAT);
  const spent = sum(tx, t => t.amount);
  const weeks = weeksOf(key).map(w => ({
    ...w,
    env: (fresh * w.days) / M.days,
    spent: sum(
      tx.filter(t => t.date >= w.from && t.date <= w.to && !(t.list || '').endsWith(':M')),
      t => t.amount
    ),
    list: getList(w.key)
  }));
  const small = tx.filter(t => !t.list && t.amount < 15);
  const offItems = Object.entries(gState().lists)
    .filter(([k]) => k.startsWith(key))
    .flatMap(([, L]) => L.items.filter(i => i.offList && i.checked));
  const resto = sum(
    M.txs.filter(t => t.type === 'expense' && t.categoryId === 'c-resto'),
    t => t.amount
  );
  const doneLists = Object.entries(gState().lists).filter(
    ([k, L]) => k.startsWith(key) && L.done && L.ticket > 0
  );
  const drift = sum(doneLists, ([, L]) => L.ticket - plannedBought(L));
  return {
    key,
    M,
    budget,
    planM,
    fresh,
    tx,
    spent,
    weeks,
    small,
    smallSum: sum(small, t => t.amount),
    off: sum(offItems, lineTotal),
    offN: offItems.length,
    resto,
    mList,
    drift,
    doneN: doneLists.length,
    weekAvg: fresh / (M.days / 7)
  };
}

export function listMeta(key) {
  const [k, part] = key.split(':');
  const G = groceryMonth(k);
  const L = getList(key);
  if (part === 'M')
    return {
      title: 'Grande course du mois',
      sub: `Stock · ${monthName(k)}`,
      env: G.mList && G.mList.done ? listEstimate(G.mList) : G.planM,
      isM: true,
      G
    };
  const w = G.weeks[+part.slice(1) - 1];
  return {
    title: `Semaine ${w.n}`,
    sub: `${dayShort(w.from)} – ${dayShort(w.to)}`,
    env: w.env,
    w,
    other: Math.max(0, w.spent - (L && L.done ? L.ticket : 0)),
    G
  };
}

export function listStatus(L, env) {
  if (!L) return { t: 'À préparer', k: 'none' };
  if (L.done)
    return { t: `Faite · ${money0(L.ticket)}`, k: L.ticket > env * 1.05 + 1 ? 'question' : 'keep' };
  const n = L.items.filter(i => i.checked).length;
  return n
    ? { t: `En cours · ${n}/${L.items.length}`, k: 'suggest' }
    : { t: `${L.items.length} article${L.items.length > 1 ? 's' : ''}`, k: 'none' };
}
