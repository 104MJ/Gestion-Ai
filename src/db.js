/**
 * Persistance locale avec Dexie (IndexedDB). Rien ne quitte le téléphone.
 * Chaque collection de l'état a sa table ; les réglages simples sont dans « kv ».
 */
import Dexie from 'dexie';

export const db = new Dexie('cap-budget');
db.version(1).stores({
  kv: 'key',
  transactions: 'id, date, type, categoryId',
  subs: 'id',
  goals: 'id',
  vaults: 'id',
  debts: 'id',
  envies: 'id',
  categories: 'id',
  fixed: 'id',
  groceryItems: 'id',
  groceryLists: 'key',
  photos: 'id'
});

/** Collections (tableaux de l'état) ↔ tables Dexie */
export const TABLES = [
  'transactions',
  'subs',
  'goals',
  'vaults',
  'debts',
  'envies',
  'categories',
  'fixed'
];
/** Champs simples de l'état regroupés dans kv.settings */
export const SETTINGS_KEYS = [
  'version',
  'onboarded',
  'name',
  'currency',
  'createdAt',
  'income',
  'savingsPlan',
  'activeGoalId',
  'closedMonths',
  'anchor',
  'savingsSeparate',
  'modules',
  'push',
  'labelCats',
  'noSpend',
  'checks'
];

export async function loadAll() {
  const settings = (await db.kv.get('settings'))?.value;
  if (!settings) return null;
  const state = { ...settings };
  for (const t of TABLES) state[t] = await db.table(t).toArray();
  const lists = await db.groceryLists.toArray();
  state.groceries = {
    items: await db.groceryItems.toArray(),
    lists: Object.fromEntries(lists.map(({ key, ...l }) => [key, l]))
  };
  return state;
}
export async function loadPhotos() {
  const all = await db.photos.toArray();
  return Object.fromEntries(all.map(p => [p.id, p.data]));
}
const plain = v => JSON.parse(JSON.stringify(v ?? null));

export async function saveSettings(S) {
  const value = {};
  SETTINGS_KEYS.forEach(k => {
    if (S[k] !== undefined) value[k] = plain(S[k]);
  });
  await db.kv.put({ key: 'settings', value });
}
export async function saveTable(name, rows) {
  await db.transaction('rw', db.table(name), async () => {
    await db.table(name).clear();
    await db.table(name).bulkPut(plain(rows));
  });
}
export async function saveGroceries(G) {
  await db.transaction('rw', db.groceryItems, db.groceryLists, async () => {
    await db.groceryItems.clear();
    await db.groceryItems.bulkPut(plain(G.items || []));
    await db.groceryLists.clear();
    await db.groceryLists.bulkPut(
      Object.entries(plain(G.lists || {})).map(([key, l]) => ({ key, ...l }))
    );
  });
}
export const savePhoto = (id, data) => db.photos.put({ id, data });
export const deletePhoto = id => db.photos.delete(id);
export async function clearAll() {
  await Promise.all(db.tables.map(t => t.clear()));
}
