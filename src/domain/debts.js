/**
 * « On me doit » : argent prêté et remboursements attendus.
 */
import { sum } from './utils.js';
import { S } from './state.js';

export const openDebts = () => S.debts.filter(d => !d.settledAt);

export const debtLeft = d => d.amount - sum(d.paid || [], p => p.amount);
