/**
 * Import du relevé bancaire CSV : lecture, nettoyage des libellés, catégories, rapprochement.
 */
import { pad } from './utils.js';
import { pd, addDays } from './dates.js';
import { S } from './state.js';
import { occurrences } from './subscriptions.js';

/**
 * Mots-clés des libellés bancaires → catégorie. Chaque entrée est un morceau
 * d'expression régulière (\b = début/fin de mot, ? = caractère optionnel).
 */
const KEYWORDS = {
  'c-food': [
    'carrefour',
    'lidl',
    'auchan',
    'leclerc',
    'intermarch',
    'monoprix',
    'franprix',
    'casino',
    'aldi',
    'super ?u\\b',
    'hyper ?u\\b',
    'picard',
    'biocoop',
    'naturalia',
    'g20',
    'spar\\b',
    'netto',
    'grand frais',
    'supermarch',
    'primeur',
    'epicerie',
    'épicerie'
  ],
  'c-resto': [
    'uber ?eats',
    'deliveroo',
    'just ?eat',
    'mc ?do',
    'mcdonald',
    'burger',
    'kfc',
    'starbucks',
    'boulang',
    '\\bpaul\\b',
    'resto',
    'restaurant',
    'caf[eé]\\b',
    'brasserie',
    'pizza',
    'sushi',
    'tacos',
    'kebab',
    'snack',
    'bar\\b'
  ],
  'c-transport': [
    'sncf',
    '\\btcl\\b',
    'ratp',
    '\\buber\\b',
    'bolt',
    'blablacar',
    'totalenergies',
    '\\btotal\\b',
    'esso',
    'shell',
    '\\bbp\\b',
    'station',
    'parking',
    'velo.?v',
    'lime',
    'ouigo',
    'flixbus',
    'navigo',
    'keolis'
  ],
  'c-fun': [
    'cin[eé]ma',
    'path[eé]',
    'ugc',
    'fnac',
    'concert',
    'ticketmaster',
    'steam',
    'playstation',
    'nintendo',
    'bowling',
    'mus[eé]e',
    'th[eé][aâ]tre',
    'spectacle'
  ],
  'c-shop': [
    'amazon',
    'zara',
    'h ?& ?m\\b',
    'primark',
    'vinted',
    'zalando',
    'shein',
    'decathlon',
    'sephora',
    'kiabi',
    'uniqlo',
    'mango',
    'bershka',
    'pull ?& ?bear',
    'nocibe',
    'temu',
    'aliexpress'
  ],
  'c-health': [
    'pharma',
    'doctolib',
    'm[eé]decin',
    'dentist',
    'opticien',
    'laboratoire',
    'kin[eé]',
    'hopital',
    'hôpital',
    'clinique'
  ],
  'c-home': [
    'ikea',
    'leroy',
    'castorama',
    'action\\b',
    'maisons? du monde',
    'darty',
    'boulanger',
    'but\\b',
    'conforama',
    'brico'
  ],
  'i-salary': ['salaire', 'paie', 'remuneration', 'rémunération'],
  'i-aid': ['\\bcaf\\b', '\\bapl\\b', 'bourse', 'crous', 'prime d.activit']
};

/** [idCatégorie, expression régulière] construits à partir des mots-clés. */
export const CAT_RULES = Object.entries(KEYWORDS).map(([id, words]) => [
  id,
  new RegExp(words.join('|'))
]);

export const SAVING_RE = /livret|[eé]pargne|\bldds?\b|\blep\b|\bpel\b|\bcel\b|assurance.?vie/i;

export const normTxt = s =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // retire les accents;

export function cleanLabel(s) {
  let t = String(s || '')
    .replace(/\s+/g, ' ')
    .trim();
  t = t
    .replace(/\b\d{2}\/\d{2}(\/\d{2,4})?\b/g, ' ')
    .replace(/\b(cb|carte)\s*x?\*?\d{4}\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  for (let k = 0; k < 3; k++)
    t = t
      .replace(
        /^(facture carte|paiement par carte|paiement par|paiement carte|paiement cb|achat cb|carte|cb|prlv sepa|prelevement sepa|prélèvement sepa|prlv|vir(ement)? sepa( recu| emis| reçu| émis)?|vir inst|virement|retrait dab|du|le)\b\s*/i,
        ''
      )
      .trim();
  if (t === t.toUpperCase())
    t = t.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  return t.slice(0, 50) || 'Opération';
}

export function guessCat(label, amount) {
  const key = normTxt(cleanLabel(label)).slice(0, 14);
  if (S.labelCats && S.labelCats[key]) return S.labelCats[key];
  const n = normTxt(label);
  for (const [id, re] of CAT_RULES)
    if (re.test(n)) {
      if (amount > 0 === id.startsWith('i-')) return id;
    }
  return amount > 0 ? 'i-other' : 'c-other';
}

export function parseCSV(text) {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter(l => l.trim());
  const sample = lines.slice(0, 30).join('\n');
  const delim = [';', '\t', ',']
    .map(d => [d, (sample.match(new RegExp(d === '\t' ? '\t' : '\\' + d, 'g')) || []).length])
    .sort((a, b) => b[1] - a[1])[0][0];
  const split = line => {
    const out = [];
    let cur = '',
      q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = !q;
      } else if (c === delim && !q) {
        out.push(cur.trim());
        cur = '';
      } else cur += c;
    }
    out.push(cur.trim());
    return out;
  };
  return lines.map(split);
}

export function parseNum(v) {
  if (v == null) return NaN;
  let s = String(v)
    .replace(/[\s €]/g, '')
    .replace(/EUR/i, '');
  if (!s) return NaN;
  let neg = false;
  if (/-$/.test(s)) {
    neg = true;
    s = s.slice(0, -1);
  }
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = parseFloat(s);
  return isFinite(n) ? (neg ? -Math.abs(n) : n) : NaN;
}

export function parseDateStr(v) {
  const s = String(v || '').trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/))) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${y}-${pad(+m[2])}-${pad(+m[1])}`;
  }
  return null;
}

export function readStatement(rows) {
  // repère la ligne d'en-tête
  let hi = rows.findIndex(
    r => r.some(c => /date/i.test(c)) && r.some(c => /montant|d[ée]bit|cr[ée]dit|amount/i.test(c))
  );
  let cDate, cLabel, cAmt, cDeb, cCred;
  if (hi >= 0) {
    const H = rows[hi].map(normTxt);
    cDate = H.findIndex(h => /date( d.)?op|^date$|date comptable|date/.test(h));
    cLabel = H.findIndex(
      h => /libell|description|intitul|detail|label|nature|operation/.test(h) && !/date/.test(h)
    );
    cAmt = H.findIndex(h => /montant|amount/.test(h));
    cDeb = H.findIndex(h => /debit/.test(h));
    cCred = H.findIndex(h => /credit/.test(h));
  } else {
    hi = -1;
    const r0 = rows.find(r => r.some(c => parseDateStr(c)));
    if (!r0) return [];
    cDate = r0.findIndex(c => parseDateStr(c));
    const nums = r0
      .map((c, i) => (i !== cDate && isFinite(parseNum(c)) && /\d/.test(c) ? i : -1))
      .filter(i => i >= 0);
    cAmt = nums[0];
    cLabel = r0.findIndex((c, i) => i !== cDate && !nums.includes(i) && c.length > 2);
  }
  if (cLabel < 0)
    cLabel = rows[hi + 1]
      ? rows[hi + 1].findIndex((c, i) => i !== cDate && isNaN(parseNum(c)))
      : -1;
  const out = [];
  rows.slice(hi + 1).forEach(r => {
    const date = parseDateStr(r[cDate]);
    if (!date) return;
    let amt = NaN;
    if (cAmt >= 0 && r[cAmt] !== '') amt = parseNum(r[cAmt]);
    if (!isFinite(amt) && (cDeb >= 0 || cCred >= 0)) {
      const d = parseNum(r[cDeb]),
        c = parseNum(r[cCred]);
      amt = isFinite(c) && c ? Math.abs(c) : isFinite(d) ? -Math.abs(d) : NaN;
    }
    if (!isFinite(amt) || !amt) return;
    out.push({ date, label: (r[cLabel] || '').trim(), amount: Math.round(amt * 100) / 100 });
  });
  return out;
}

export function classify(rows) {
  const used = new Set();
  const res = [];
  const near = (a, b, d) => Math.abs((pd(a) - pd(b)) / 864e5) <= d;
  rows
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(r => {
      const abs = Math.abs(r.amount),
        type = r.amount < 0 ? 'expense' : 'income',
        n = normTxt(r.label);
      let kind = 'missing',
        why = '';
      if (r.date < S.createdAt) {
        kind = 'before';
      } else {
        const tx = S.transactions.find(
          t =>
            !used.has(t.id) &&
            t.type === type &&
            Math.abs(t.amount - abs) < 0.01 &&
            near(t.date, r.date, 4)
        );
        if (tx) {
          used.add(tx.id);
          kind = 'known';
          why = 'déjà noté';
        } else if (
          type === 'expense' &&
          S.subs.some(
            s =>
              (n.includes(normTxt(s.name).split(' ')[0]) || Math.abs(s.price - abs) < 0.01) &&
              occurrences(s, addDays(r.date, -5), addDays(r.date, 5)).length
          )
        ) {
          kind = 'known';
          why = 'abonnement';
        } else if (
          type === 'expense' &&
          S.fixed.some(
            f =>
              Math.abs(f.amount - abs) < 0.01 ||
              (n.includes(normTxt(f.name)) && Math.abs(f.amount - abs) < f.amount * 0.1)
          )
        ) {
          kind = 'known';
          why = 'charge fixe';
        } else if (SAVING_RE.test(r.label)) {
          kind = 'known';
          why = 'épargne / virement interne';
        }
      }
      res.push({
        ...r,
        kind,
        why,
        type,
        clean: cleanLabel(r.label),
        cat: guessCat(r.label, r.amount),
        on: kind === 'missing'
      });
    });
  return res;
}

export async function readFileText(f) {
  const buf = await f.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch (e) {
    return new TextDecoder('windows-1252').decode(buf);
  }
}
