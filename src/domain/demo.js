/**
 * Données de démonstration.
 */
import { COLORS, uid } from './utils.js';
import { ds, today, addDays, curKey } from './dates.js';
import { S, baseState } from './state.js';
import { starterItems, currentWeek } from './groceries.js';

export function demoState() {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const D = baseState();
  D.onboarded = true;
  D.name = S.name || 'MJ';
  D.createdAt = ds(start);
  D.income = 1450;
  D.savingsPlan = 150;
  D.fixed = [
    { id: uid(), name: 'Loyer', amount: 520, icon: 'home' },
    { id: uid(), name: 'Assurance habitation', amount: 14, icon: 'receipt' },
    { id: uid(), name: 'Forfait mobile', amount: 9.99, icon: 'phone' }
  ];
  const g = {
    id: 'g-demo',
    name: 'Billet pour Kinshasa',
    target: 950,
    photoId: null,
    createdAt: ds(start),
    deposits: []
  };
  for (let k = 0; k < 3; k++)
    g.deposits.push({
      id: uid(),
      date: ds(new Date(start.getFullYear(), start.getMonth() + k, 3)),
      amount: 150,
      note: 'Épargne du mois',
      kind: 'plan'
    });
  D.goals = [g];
  D.activeGoalId = g.id;
  const sd = (dOff, day) => ds(new Date(start.getFullYear(), start.getMonth() + dOff, day));
  const uses = (n, span) => {
    const a = [];
    for (let i = 0; i < n; i++) a.push(addDays(today(), -Math.floor(rnd() * span)));
    return a.sort();
  };
  D.subs = [
    {
      id: uid(),
      name: 'Netflix',
      price: 13.49,
      freq: 'month',
      startDate: sd(-6, 5),
      trialEnd: '',
      icon: 'film',
      color: COLORS[3],
      usage: 'sometimes',
      verdict: '',
      uses: uses(4, 80),
      cancelledAt: null
    },
    {
      id: uid(),
      name: 'Spotify',
      price: 11.12,
      freq: 'month',
      startDate: sd(-10, 12),
      trialEnd: '',
      icon: 'music',
      color: COLORS[2],
      usage: 'often',
      verdict: 'keep',
      uses: uses(38, 90),
      cancelledAt: null
    },
    {
      id: uid(),
      name: 'Basic-Fit',
      price: 29.99,
      freq: 'month',
      startDate: sd(-4, 1),
      trialEnd: '',
      icon: 'dumbbell',
      color: COLORS[1],
      usage: 'sometimes',
      verdict: '',
      uses: uses(2, 100).map(d => addDays(d, -40)),
      cancelledAt: null
    },
    {
      id: uid(),
      name: 'iCloud+',
      price: 2.99,
      freq: 'month',
      startDate: sd(-12, 20),
      trialEnd: '',
      icon: 'cloud',
      color: COLORS[6],
      usage: 'often',
      verdict: 'keep',
      uses: [],
      cancelledAt: null
    },
    {
      id: uid(),
      name: 'ChatGPT Plus',
      price: 23,
      freq: 'month',
      startDate: sd(-2, 8),
      trialEnd: '',
      icon: 'bot',
      color: COLORS[4],
      usage: 'often',
      verdict: 'question',
      uses: uses(14, 60),
      cancelledAt: null
    },
    {
      id: uid(),
      name: 'Canva Pro',
      price: 110,
      freq: 'year',
      startDate: sd(-9, 15),
      trialEnd: '',
      icon: 'image',
      color: COLORS[8],
      usage: 'never',
      verdict: '',
      uses: [],
      cancelledAt: null
    },
    {
      id: uid(),
      name: 'Disney+',
      price: 9.99,
      freq: 'month',
      startDate: addDays(today(), 2),
      trialEnd: addDays(today(), 2),
      icon: 'film',
      color: COLORS[0],
      usage: '',
      verdict: '',
      uses: uses(1, 5),
      cancelledAt: null
    },
    {
      id: uid(),
      name: 'Deezer',
      price: 11.99,
      freq: 'month',
      startDate: sd(-8, 3),
      trialEnd: '',
      icon: 'music',
      color: COLORS[7],
      usage: 'never',
      verdict: 'cancel',
      uses: [],
      cancelledAt: sd(-1, 20)
    }
  ];
  const T = [];
  const add = (date, amount, cat, note) => {
    const t = {
      id: uid(),
      type: 'expense',
      amount: Math.round(amount * 100) / 100,
      categoryId: cat,
      date,
      note,
      createdAt: 0
    };
    T.push(t);
    return t;
  };
  D.groceries = { items: starterItems(), lists: {} };
  [
    ['c-food', 220],
    ['c-resto', 80],
    ['c-fun', 50],
    ['c-shop', 70],
    ['c-transport', 35],
    ['c-health', 25]
  ].forEach(([id, v]) => {
    const c = D.categories.find(x => x.id === id);
    if (c) c.budget = v;
  });
  const mkL = rh => ({
    items: D.groceries.items
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
  });
  const ck = curKey();
  const stores = ['Lidl', 'Carrefour', 'Auchan'];
  for (let d = new Date(start); ds(d) <= today(); d.setDate(d.getDate() + 1)) {
    const s = ds(d),
      dow = d.getDay();
    if (d.getDate() === 1)
      T.push({
        id: uid(),
        type: 'income',
        amount: 1450,
        categoryId: 'i-salary',
        date: s,
        note: 'Salaire alternance',
        createdAt: 0
      });
    if (d.getDate() === 2) add(s, 30.8, 'c-transport', 'Pass TCL');
    const k = s.slice(0, 7);
    if (d.getDate() === 3) {
      const st = stores[Math.floor(rnd() * 3)];
      const t = add(s, 38 + rnd() * 12, 'c-food', `Courses du mois · ${st}`);
      if (k === ck) {
        const L = mkL('month');
        L.items.forEach(i => (i.checked = true));
        Object.assign(L, { done: true, ticket: t.amount, txId: t.id });
        t.list = `${k}:M`;
        D.groceries.lists[t.list] = L;
      }
    }
    if (dow === 6) {
      const w = Math.min(4, Math.floor((d.getDate() - 1) / 7) + 1);
      const st = stores[Math.floor(rnd() * 3)];
      const t = add(s, 26 + rnd() * 16, 'c-food', `Courses S${w} · ${st}`);
      if (k === ck && !D.groceries.lists[`${k}:W${w}`]) {
        const L = mkL('week');
        L.items.forEach(i => (i.checked = rnd() > 0.15));
        if (rnd() < 0.6)
          L.items.push({
            id: uid(),
            itemId: null,
            name: rnd() < 0.5 ? 'Chocolat' : 'Biscuits apéro',
            aisle: 'Épicerie',
            price: 2.5 + Math.round(rnd() * 3),
            qty: 1,
            checked: true,
            offList: true
          });
        Object.assign(L, { done: true, ticket: t.amount, txId: t.id });
        t.list = `${k}:W${w}`;
        D.groceries.lists[t.list] = L;
      }
    }
    if (rnd() < 0.09) add(s, 3 + rnd() * 9, 'c-food', rnd() < 0.5 ? 'Carrefour City' : 'Supérette');
    if (rnd() < 0.15) add(s, 3 + rnd() * 5, 'c-resto', 'Café');
    if ((dow === 5 || dow === 6) && rnd() < 0.35)
      add(s, 12 + rnd() * 16, 'c-resto', rnd() < 0.5 ? 'Resto' : 'Brunch');
    if (rnd() < 0.07) add(s, 12 + rnd() * 30, 'c-fun', rnd() < 0.5 ? 'Ciné' : 'Sortie');
    if (rnd() < 0.03) add(s, 25 + rnd() * 45, 'c-shop', rnd() < 0.5 ? 'Zara' : 'Vinted');
    if (rnd() < 0.035) add(s, 8 + rnd() * 20, 'c-health', 'Pharmacie');
    if (rnd() < 0.03) add(s, 10 + rnd() * 25, 'c-home', 'Maison');
  }
  add(addDays(today(), -3), 64.9, 'c-shop', 'Veste Vinted');
  D.transactions = T;
  D.fixed.forEach((f, i) => (f.day = [5, 10, 15][i] || 1));
  D.modules = { courses: true, envies: true, vaults: true, debts: true, check: true };
  const mAgo = k => {
    const x = new Date();
    x.setMonth(x.getMonth() - k);
    return ds(x);
  };
  const due = (mo, day) => {
    const x = new Date(now.getFullYear(), now.getMonth() + mo, day);
    return ds(x);
  };
  D.vaults = [
    {
      id: uid(),
      name: 'Cadeaux de Noël',
      target: 200,
      dueDate: due(2, 20),
      icon: 'gift',
      color: COLORS[3],
      createdAt: mAgo(2),
      deposits: [
        { id: uid(), date: mAgo(2), amount: 45 },
        { id: uid(), date: mAgo(1), amount: 52 }
      ],
      uses: [],
      closedAt: null
    },
    {
      id: uid(),
      name: 'Vêtements d’hiver',
      target: 150,
      dueDate: due(1, 15),
      icon: 'shirt',
      color: COLORS[6],
      createdAt: mAgo(1),
      deposits: [{ id: uid(), date: mAgo(1), amount: 75 }],
      uses: [],
      closedAt: null
    },
    {
      id: uid(),
      name: 'Dentiste',
      target: 90,
      dueDate: due(4, 10),
      icon: 'health',
      color: COLORS[2],
      createdAt: today(),
      deposits: [],
      uses: [],
      closedAt: null
    }
  ];
  D.debts = [
    {
      id: uid(),
      type: 'person',
      who: 'Sarah',
      amount: 45,
      reason: 'Place de concert',
      date: addDays(today(), -12),
      paid: [],
      settledAt: null
    },
    {
      id: uid(),
      type: 'refund',
      who: 'Mutuelle',
      amount: 30,
      reason: 'Consultation dentiste',
      date: addDays(today(), -38),
      paid: [],
      settledAt: null
    }
  ];
  D.checks = [
    { date: addDays(today(), -21), real: 640, exp: 652, diff: -12 },
    { date: addDays(today(), -14), real: 598, exp: 598.4, diff: -0.4 },
    { date: addDays(today(), -7), real: 571.2, exp: 571.2, diff: 0 }
  ];
  D.anchor = { date: addDays(today(), -7), ts: 0, balance: 571.2 };
  {
    const cwk = currentWeek().key;
    if (!D.groceries.lists[cwk]) {
      const L = mkL('week');
      L.items.slice(0, 3).forEach(i => (i.checked = true));
      D.groceries.lists[cwk] = L;
    }
  }
  const h = 3600e3;
  D.envies = [
    {
      id: uid(),
      name: 'Baskets New Balance',
      amount: 120,
      createdAt: Date.now() - 80 * h,
      status: 'waiting'
    },
    {
      id: uid(),
      name: 'Casque audio',
      amount: 89,
      createdAt: Date.now() - 20 * h,
      status: 'waiting'
    },
    {
      id: uid(),
      name: 'Sweat oversize',
      amount: 45,
      createdAt: Date.now() - 20 * 24 * h,
      status: 'renounced',
      decidedAt: Date.now() - 17 * 24 * h
    }
  ];
  g.deposits.push({
    id: uid(),
    date: ds(new Date(Date.now() - 17 * 24 * h)),
    amount: 45,
    note: 'Envie abandonnée : sweat oversize',
    kind: 'envie'
  });
  return D;
}
