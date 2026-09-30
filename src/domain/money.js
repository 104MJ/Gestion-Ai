/**
 * Formatage et lecture des montants.
 */
import { S } from './state.js';

const _f = {};

export function fmt(n, dec) {
  const k = S.currency + dec;
  if (!_f[k]) {
    try {
      _f[k] = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: S.currency,
        minimumFractionDigits: dec ? 2 : 0,
        maximumFractionDigits: dec ? 2 : 0
      });
    } catch (e) {
      _f[k] = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
    }
  }
  return _f[k].format(n);
}

export const money = n => fmt(n, true);

export const money0 = n => fmt(Math.round(n), false);

export const curSym = () => {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: S.currency })
      .formatToParts(0)
      .find(p => p.type === 'currency').value;
  } catch (e) {
    return S.currency;
  }
};

export const parseAmount = v => {
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

export const amtStr = n => (n ? String(n).replace('.', ',') : '');
