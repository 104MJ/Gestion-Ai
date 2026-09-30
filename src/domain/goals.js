/**
 * Rêve (objectif d’épargne) : progression, révélation de la photo, échéance estimée.
 */
import { sum, clamp } from './utils.js';
import { ds, today, addDays, cap } from './dates.js';
import { S } from './state.js';
import { todayInfo } from './budget.js';

export const activeGoal = () => S.goals.find(g => g.id === S.activeGoalId) || S.goals[0] || null;

export const savedOf = (g, upTo) =>
  sum(
    g.deposits.filter(x => !upTo || x.date <= upTo),
    x => x.amount
  );

export const revealOf = (g, upTo) => (g ? clamp(savedOf(g, upTo) / g.target, 0, 1) : 0);

export function penalty() {
  const { M } = todayInfo();
  if (M.B <= 0) return { p: 0, over: 0 };
  const pace = (M.B * (new Date().getDate() - M.sm + 1)) / (M.days - M.sm + 1);
  const over = M.spentTracked - pace;
  return over > 0 ? { p: Math.min(0.15, (over / M.B) * 0.6), over } : { p: 0, over: 0 };
}

export function monthlySaving() {
  if (S.savingsPlan > 0) return S.savingsPlan;
  const g = activeGoal();
  if (!g) return 0;
  const from = addDays(today(), -90);
  return (
    sum(
      g.deposits.filter(x => x.date >= from),
      x => x.amount
    ) / 3
  );
}

export function etaText(g, extra = 0) {
  const rem = g.target - savedOf(g);
  if (rem <= 0) return 'Atteint';
  const rate = monthlySaving() + extra;
  if (rate <= 0) return null;
  const months = rem / rate;
  const d = new Date();
  d.setDate(d.getDate() + Math.round(months * 30.44));
  return cap(d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
}

export function etaDay(g, extra = 0) {
  const rem = g.target - savedOf(g),
    rate = monthlySaving() + extra;
  if (rem <= 0 || rate <= 0) return null;
  return ds(new Date(Date.now() + (rem / rate) * 30.44 * 864e5));
}

export function durText(days) {
  if (days < 0.75) return 'quelques heures';
  if (days < 1.5) return '1 jour';
  if (days < 14) return `${Math.round(days)} jours`;
  if (days < 60) return `${Math.round(days / 7)} semaines`;
  return `${Math.round(days / 30.44)} mois`;
}

export function impact(amount) {
  const g = activeGoal();
  if (!g) return '';
  const rate = monthlySaving() / 30.44;
  if (rate > 0) return `= ${durText(amount / rate)} de retard sur « ${g.name} »`;
  return `= ${Math.max(1, Math.round((amount / g.target) * 100))} % de « ${g.name} »`;
}
