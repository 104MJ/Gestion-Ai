/**
 * Histoire mensuelle : le texte de chaque chapitre (un chapitre = un mois).
 */
import { esc, sum, plural } from './utils.js';
import { ds, today, addDays, curKey, dayShort } from './dates.js';
import { S } from './state.js';
import { money0 } from './money.js';
import { getCat, mm } from './budget.js';
import { activeGoal, revealOf } from './goals.js';
import { groceryMonth } from './groceries.js';

/** Titre d'ambiance selon la part des jours tenus. */
function moodOf(isCur, ratio) {
  if (isCur) return 'en cours d’écriture';
  if (ratio >= 0.85) return 'La maîtrise';
  if (ratio >= 0.6) return 'L’équilibre';
  if (ratio >= 0.35) return 'Les montagnes russes';
  return 'La tempête';
}

/** Jour où la dépense a le plus dépassé ce qui était prévu. */
function worstDay(days) {
  let worst = null;
  days.forEach(d => {
    const over = d.spent - d.allow;
    if (over > 0.5 && (!worst || over > worst.over)) worst = { ...d, over };
  });
  return worst;
}

/** Catégorie la plus coûteuse du mois : [idCatégorie, montant]. */
function topCategory(txs) {
  const byCat = {};
  txs
    .filter(t => t.type === 'expense')
    .forEach(t => {
      byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount;
    });
  return Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
}

export function chapterData(key) {
  const M = mm(key);
  const isCur = key === curKey();
  const tracked = M.daysArr.filter(d => d.tracked && !d.future);
  const held = tracked.filter(d => d.held).length;
  const leftover = M.B - M.spentTracked;
  const mood = moodOf(isCur, tracked.length ? held / tracked.length : 0);
  const L = [];

  // Jours tenus
  L.push(
    isCur
      ? `Pour l’instant, tu as tenu <b>${plural(held, 'jour')} sur ${tracked.length}</b>.`
      : `Tu as tenu <b>${plural(held, 'jour')} sur ${tracked.length}</b>.`
  );

  // Catégorie la plus chère
  const top = topCategory(M.txs);
  if (top) {
    const name = esc(getCat(top[0]).name.toLowerCase());
    L.push(`Ce qui t’a coûté le plus : <b>${name}</b>, ${money0(top[1])}.`);
  }

  // Plus gros écart
  const worst = worstDay(tracked);
  if (worst) {
    const when = dayShort(worst.date);
    L.push(
      `Ton plus gros écart : le ${when}, ${money0(worst.spent)} dépensés pour ${money0(worst.allow)} prévus.`
    );
  } else if (tracked.length) {
    L.push('Aucun écart : chaque jour est resté dans sa limite.');
  }

  // Envies abandonnées
  const renounced = S.envies.filter(
    e => e.status === 'renounced' && e.decidedAt && ds(new Date(e.decidedAt)).startsWith(key)
  );
  if (renounced.length) {
    const saved = money0(sum(renounced, e => e.amount));
    L.push(`Tu as renoncé à ${plural(renounced.length, 'envie')} : <b>${saved} sauvés</b>.`);
  }

  // Courses
  const G = groceryMonth(key);
  if (G.spent > 0) {
    let line = `Courses : ${money0(G.spent)}`;
    if (G.budget) line += ` pour ${money0(G.budget)} prévus`;
    if (G.small.length) {
      line += `, dont ${plural(G.small.length, 'petit passage', 'petits passages')} (${money0(G.smallSum)})`;
    }
    L.push(line + '.');
  }

  // Abonnements
  if (M.A > 0) {
    const cancelled = S.subs.filter(s => s.cancelledAt && s.cancelledAt.startsWith(key));
    let line = `Tes abonnements ont pris ${money0(M.A)}.`;
    if (cancelled.length) line += ` Tu as résilié ${cancelled.map(s => esc(s.name)).join(' et ')}.`;
    L.push(line);
  }

  // Rêve
  const g = activeGoal();
  if (g) {
    const end = isCur ? today() : M.to;
    const r1 = revealOf(g, end);
    const r0 = revealOf(g, addDays(M.from, -1));
    let line = `« ${esc(g.name)} » est révélé à <b>${Math.round(r1 * 100)} %</b>`;
    if (r1 - r0 > 0.004) line += ` (+${Math.round((r1 - r0) * 100)} pts)`;
    L.push(line + '.');
  }

  // Points hebdo
  const checks = S.checks.filter(c => c.date.startsWith(key));
  if (checks.length) {
    const clean = checks.filter(c => Math.abs(c.diff) < 5).length;
    const missed = sum(checks, c => Math.abs(c.diff));
    let line = `Points hebdo avec ta banque : ${plural(checks.length, 'fait', 'faits')}, `;
    line += clean ? `${clean} sans écart` : 'avec des écarts à corriger';
    if (clean < checks.length) line += ` (${money0(missed)} d’oublis au total)`;
    L.push(line + '.');
  }

  // Conclusion
  if (isCur) {
    L.push(
      leftover >= 0
        ? `Il te reste ${money0(leftover)} pour finir le mois.`
        : `Le mois déborde déjà de ${money0(-leftover)}.`
    );
  } else {
    L.push(
      leftover >= 0
        ? `Le chapitre se termine avec <b>${money0(leftover)} d’avance</b>.`
        : `Le chapitre se termine avec ${money0(-leftover)} de dépassement. Le suivant peut rattraper ça.`
    );
  }

  return { M, isCur, tracked, held, mood, L, leftover };
}
