/**
 * Fonctionnalités activables dans les réglages.
 */
import { APP_NAME } from '../config.js';
import { S } from './state.js';

export const MODULES = [
  { k: 'courses', t: 'Courses', d: 'Grande course du mois et listes par semaine.' },
  {
    k: 'envies',
    t: 'Envies · règle des 72 h',
    d: 'Noter une envie au lieu d’acheter tout de suite.'
  },
  {
    k: 'vaults',
    t: 'Coffres',
    d: 'Mettre de côté pour les dépenses rares : cadeaux, vêtements, dentiste…'
  },
  {
    k: 'debts',
    t: 'On me doit',
    d: 'Suivre l’argent prêté ou les remboursements attendus. À activer seulement si tu en as besoin.'
  },
  {
    k: 'check',
    t: 'Point hebdo avec ma banque',
    d: `Comparer chaque semaine le solde réel de ton compte avec celui que ${APP_NAME} attend.`
  }
];

export const mod = k => !S.modules || S.modules[k] !== false;
