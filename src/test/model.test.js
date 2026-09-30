import { describe, it, expect, beforeEach } from 'vitest';
import {
  S,
  replaceState,
  baseState,
  today,
  addDays,
  curKey,
  mm,
  todayInfo,
  occurrences,
  addPeriod,
  monthlyEq,
  parseAmount,
  parseCSV,
  readStatement,
  cleanLabel,
  guessCat,
  classify,
  weeksOf,
  vaultNeed,
  expectedBalance,
  demoState,
  groceryMonth
} from '../domain/model.js';

beforeEach(() => {
  replaceState({
    ...baseState(),
    onboarded: true,
    income: 1500,
    savingsPlan: 100,
    createdAt: `${curKey()}-01`
  });
});

describe('montants', () => {
  it('lit les montants français', () => {
    expect(parseAmount('12,50')).toBe(12.5);
    expect(parseAmount('1 234,5')).toBe(1234.5);
    expect(Number.isNaN(parseAmount('abc'))).toBe(true);
  });
});

describe('budget du quotidien', () => {
  it('retire charges, abonnements, rêve et coffres des revenus', () => {
    S.fixed.push({ id: 'f', name: 'Loyer', amount: 500, day: 5 });
    S.subs.push({
      id: 's',
      name: 'Netflix',
      price: 10,
      freq: 'month',
      startDate: `${curKey()}-03`,
      uses: []
    });
    const M = mm(curKey());
    expect(M.B).toBeCloseTo(1500 - 500 - 10 - 100, 5);
  });
  it('le montant du jour baisse après une dépense', () => {
    const before = todayInfo().leftToday;
    S.transactions.push({
      id: 't',
      type: 'expense',
      amount: 20,
      categoryId: 'c-food',
      date: today(),
      note: ''
    });
    expect(todayInfo().leftToday).toBeCloseTo(before - 20, 5);
  });
});

describe('abonnements', () => {
  it('calcule les prélèvements mensuels, y compris les fins de mois', () => {
    expect(addPeriod('2026-01-31', 1, 'month')).toBe('2026-02-28');
    const s = { price: 10, freq: 'month', startDate: '2026-01-15' };
    expect(occurrences(s, '2026-01-01', '2026-04-30')).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
      '2026-04-15'
    ]);
    expect(monthlyEq({ price: 120, freq: 'year' })).toBe(10);
  });
});

describe('courses', () => {
  it('découpe le mois en 4 semaines, la dernière jusqu’à la fin du mois', () => {
    const w = weeksOf('2026-09');
    expect(w).toHaveLength(4);
    expect(w[3].from).toBe('2026-09-22');
    expect(w[3].to).toBe('2026-09-30');
  });
});

describe('coffres', () => {
  it('répartit le montant sur les mois restants', () => {
    const due = addDays(`${curKey()}-01`, 70);
    const v = {
      id: 'v',
      target: 300,
      dueDate: due,
      createdAt: today(),
      deposits: [],
      uses: [],
      closedAt: null
    };
    expect(vaultNeed(v, curKey())).toBeGreaterThan(0);
    expect(vaultNeed(v, curKey()) * 3).toBeCloseTo(300, 0);
  });
});

describe('point hebdo', () => {
  it('attend le solde de départ moins les dépenses notées ensuite', () => {
    S.anchor = { date: addDays(today(), -3), ts: 0, balance: 800 };
    S.transactions.push({
      id: 'a',
      type: 'expense',
      amount: 30,
      categoryId: 'c-food',
      date: addDays(today(), -1),
      note: ''
    });
    expect(expectedBalance()).toBeCloseTo(770, 2);
  });
});

describe('import CSV', () => {
  const csv =
    'Téléchargement\n\nDate;Libellé;Débit euros;Crédit euros;\n' +
    `${today().split('-').reverse().join('/')};"CARTE X1234 12/09 LIDL";23,40;;\n` +
    `${today().split('-').reverse().join('/')};"VIR SEPA RECU CAF";;98,00;\n` +
    `${today().split('-').reverse().join('/')};"VIR LIVRET A";150,00;;\n`;
  it('lit un export débit/crédit avec en-tête décalé', () => {
    const rows = readStatement(parseCSV(csv));
    expect(rows).toHaveLength(3);
    expect(rows[0].amount).toBe(-23.4);
    expect(rows[1].amount).toBe(98);
  });
  it('nettoie les libellés et devine la catégorie', () => {
    expect(cleanLabel('PAIEMENT PAR CARTE X4521 LIDL 12/09')).toBe('Lidl');
    expect(cleanLabel('FACTURE CARTE DU 25/09 ZARA')).toBe('Zara');
    expect(guessCat('UBER EATS', -12)).toBe('c-resto');
    expect(guessCat('VIR CAF', 98)).toBe('i-aid');
  });
  it('ignore l’épargne et repère ce qui manque', () => {
    const res = classify(readStatement(parseCSV(csv)));
    expect(res.filter(r => r.kind === 'missing').map(r => r.clean)).toEqual(['Lidl', 'Caf']);
    expect(res.find(r => /livret/i.test(r.label)).kind).toBe('known');
  });
});

describe('démo', () => {
  it('génère un mois cohérent', () => {
    replaceState(demoState());
    const G = groceryMonth(curKey());
    expect(G.budget).toBe(220);
    expect(mm(curKey()).B).toBeGreaterThan(0);
  });
});
