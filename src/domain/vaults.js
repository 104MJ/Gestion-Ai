/**
 * Coffres : épargne pour les dépenses rares, répartie sur les mois restants.
 */
import { sum } from './utils.js';
import { curKey, monthsBetween } from './dates.js';
import { S } from './state.js';

export const vaultSaved = (v, before) =>
  sum(
    v.deposits.filter(d => !before || d.date < before),
    d => d.amount
  );

export const vaultUsed = (v, before) =>
  sum(
    v.uses.filter(d => !before || d.date < before),
    d => d.amount
  );

export const vaultBalance = v => vaultSaved(v) - vaultUsed(v);

export function vaultNeed(v, key) {
  if (v.closedAt && v.closedAt < `${key}-01`) return 0;
  if (v.createdAt.slice(0, 7) > key) return 0;
  const dueKey = v.dueDate.slice(0, 7);
  if (dueKey < key) return 0;
  const left = monthsBetween(key, dueKey) + 1;
  return Math.max(0, v.target - vaultSaved(v, `${key}-01`)) / left;
}

export const vaultPaidThisMonth = (v, key) =>
  sum(
    v.deposits.filter(d => d.date.startsWith(key)),
    d => d.amount
  );

export const vaultTodo = (v, key = curKey()) =>
  Math.max(0, vaultNeed(v, key) - vaultPaidThisMonth(v, key));

export const openVaults = () => S.vaults.filter(v => !v.closedAt);
