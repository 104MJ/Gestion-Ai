<script setup>
import { ref } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import { S, today, parseAmount, curSym, money, money0, debtLeft } from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const props = defineProps({ id: String });
const ui = useUI();
const d = S.debts.find(x => x.id === props.id);
const amount = ref('');
function save() {
  const amt = parseAmount(amount.value);
  if (!(amt > 0)) return ui.toast('Montant invalide');
  d.paid = (d.paid || []).concat({ date: today(), amount: Math.min(amt, debtLeft(d)) });
  if (debtLeft(d) <= 0.01) d.settledAt = today();
  ui.open('DebtsSheet', {});
  ui.toast(`+${money0(amt)} récupérés`);
}
</script>
<template>
  <SheetHead :title="`${d.who} rend une partie`" />
  <label class="field">
    <span>Montant rendu ({{ curSym() }})</span>
    <input v-model="amount" class="amount" inputmode="decimal" placeholder="0,00" />
  </label>
  <p class="hint">Reste dû : {{ money(debtLeft(d)) }}</p>
  <button class="primary" @click="save">Enregistrer</button>
</template>
