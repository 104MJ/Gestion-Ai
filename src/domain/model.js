/**
 * Point d'entrée de la logique métier : réexporte tous les modules du dossier domain/.
 * Les écrans importent depuis ici : import { money, todayInfo } from '../domain/model.js'.
 */
export * from './utils.js';
export * from './icons.js';
export * from './dates.js';
export * from './state.js';
export * from './money.js';
export * from './budget.js';
export * from './subscriptions.js';
export * from './goals.js';
export * from './groceries.js';
export * from './modules.js';
export * from './vaults.js';
export * from './debts.js';
export * from './weeklyCheck.js';
export * from './bankImport.js';
export * from './story.js';
export * from './demo.js';
