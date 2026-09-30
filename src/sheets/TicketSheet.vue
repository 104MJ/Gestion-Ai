<script setup>
import { reactive, onMounted } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import {
  S,
  uid,
  today,
  sum,
  amtStr,
  parseAmount,
  curSym,
  money,
  money0,
  getList,
  listMeta,
  listEstimate,
  basketOf,
  plannedBought,
  lineTotal,
  GROC_CAT
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const props = defineProps({ listKey: String });
const ui = useUI();
const L = getList(props.listKey);
const meta = listMeta(props.listKey);
const tx = L.txId ? S.transactions.find(t => t.id === L.txId) : null;
const pre = L.done ? L.ticket : basketOf(L) || listEstimate(L);
const F = reactive({
  amount: amtStr(Math.round(pre * 100) / 100),
  store: tx ? tx.note.split(' · ')[1] || '' : '',
  date: tx ? tx.date : today()
});
onMounted(() =>
  setTimeout(() => {
    const el = document.getElementById('tkAmount');
    el && el.select();
  }, 260)
);
function save() {
  const v = parseAmount(F.amount);
  if (!(v > 0)) return ui.toast('Entre le montant du ticket');
  const note = `Courses ${meta.isM ? 'du mois' : 'S' + meta.w.n}${F.store.trim() ? ' · ' + F.store.trim() : ''}`;
  let t = tx;
  if (t) Object.assign(t, { amount: v, date: F.date || today(), note });
  else {
    t = {
      id: uid(),
      type: 'expense',
      amount: v,
      categoryId: GROC_CAT,
      date: F.date || today(),
      note,
      list: props.listKey,
      createdAt: Date.now()
    };
    S.transactions.push(t);
  }
  L.done = true;
  L.ticket = v;
  L.txId = t.id;
  ui.close();
  const pl = plannedBought(L);
  const d = v - pl;
  const offS = sum(
    L.items.filter(i => i.offList && i.checked),
    lineTotal
  );
  ui.toast(
    `Ticket ${money(v)} · prévu ${money(pl)}${L.items.some(i => i.checked) ? ' pour ce que tu as pris' : ''}`,
    d > 1
      ? `${money0(d)} de plus que prévu${offS ? `, dont ${money0(offS)} hors liste` : ''}`
      : d < -1
        ? `${money0(-d)} sous ta liste, bien joué`
        : 'Pile dans ta liste'
  );
}
</script>
<template>
  <SheetHead title="Ticket de caisse" />
  <p class="hint" style="margin: 0 0 14px">
    {{ meta.title }} · prévu {{ money(listEstimate(L)) }}
    <template v-if="L.items.some(i => i.checked)">, panier coché {{ money(basketOf(L)) }}</template>
    .
  </p>
  <label class="field">
    <span>Montant du ticket ({{ curSym() }})</span>
    <input id="tkAmount" v-model="F.amount" class="amount" inputmode="decimal" />
  </label>
  <div class="two">
    <label class="field">
      <span>Magasin</span>
      <input id="tkStore" v-model="F.store" maxlength="30" placeholder="Lidl, Carrefour…" />
    </label>
    <label class="field">
      <span>Date</span>
      <input v-model="F.date" type="date" />
    </label>
  </div>
  <button class="primary" data-a="tksave" @click="save">Enregistrer la dépense</button>
</template>
