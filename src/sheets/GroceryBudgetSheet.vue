<script setup>
import { ref } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import {
  S,
  sum,
  mm,
  ym,
  mkey,
  curKey,
  amtStr,
  parseAmount,
  curSym,
  money0,
  groceryBudget,
  monthPlanned,
  GROC_CAT
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const ui = useUI();
const amount = ref(amtStr(groceryBudget()));
const past = [1, 2, 3]
  .map(k => {
    const { y, m } = ym(curKey());
    const kk = mkey(y, m - k);
    return kk >= S.createdAt.slice(0, 7)
      ? sum(
          mm(kk).txs.filter(t => t.type === 'expense' && t.categoryId === GROC_CAT),
          t => t.amount
        )
      : null;
  })
  .filter(v => v != null && v > 0);
const avg = past.length ? sum(past) / past.length : 0;
function save() {
  const v = parseAmount(amount.value || '0');
  if (!(v >= 0)) return ui.toast('Montant invalide');
  const c = S.categories.find(x => x.id === GROC_CAT);
  if (c) c.budget = v;
  ui.close();
  ui.toast('Budget courses enregistré');
}
</script>
<template>
  <SheetHead title="Budget courses" />
  <label class="field">
    <span>Par mois ({{ curSym() }})</span>
    <input id="gbAmount" v-model="amount" class="amount" inputmode="decimal" placeholder="0" />
  </label>
  <p class="hint">
    {{ avg ? `Ces derniers mois, tu as dépensé en moyenne ${money0(avg)} en courses. ` : '' }}La
    grande course prévue coûte environ {{ money0(monthPlanned()) }} ; le reste est réparti sur les
    semaines.
  </p>
  <button class="primary" data-a="gbsave" @click="save">Enregistrer</button>
</template>
