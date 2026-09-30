<script setup>
import { reactive } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import Icon from '../components/Icon.vue';
import {
  S,
  uid,
  today,
  amtStr,
  parseAmount,
  curSym,
  money,
  money0,
  cats,
  vaultBalance
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const props = defineProps({ id: String });
const ui = useUI();
const v = S.vaults.find(x => x.id === props.id);
const F = reactive({
  amount: amtStr(Math.round(Math.max(0, vaultBalance(v)) * 100) / 100),
  note: v.name,
  categoryId: 'c-shop'
});
function save() {
  const amt = parseAmount(F.amount);
  if (!(amt > 0)) return ui.toast('Montant invalide');
  const tx = {
    id: uid(),
    type: 'expense',
    amount: amt,
    categoryId: F.categoryId,
    date: today(),
    note: F.note.trim() || v.name,
    vault: v.id,
    createdAt: Date.now()
  };
  S.transactions.push(tx);
  v.uses.push({ date: today(), amount: amt, txId: tx.id });
  ui.close();
  ui.toast(
    `−${money(amt)} payés par « ${v.name} »`,
    vaultBalance(v) >= 0
      ? `Reste ${money0(vaultBalance(v))} dans le coffre`
      : `Le coffre était court de ${money0(-vaultBalance(v))}`
  );
}
</script>
<template>
  <SheetHead :title="`Utiliser « ${v.name} »`" />
  <p class="hint" style="margin: 0 0 14px">
    La dépense est payée par le coffre : elle ne touche pas ton budget du jour. Dans le coffre :
    {{ money(vaultBalance(v)) }}.
  </p>
  <label class="field">
    <span>Montant ({{ curSym() }})</span>
    <input id="uvAmount" v-model="F.amount" class="amount" inputmode="decimal" />
  </label>
  <label class="field">
    <span>Note</span>
    <input v-model="F.note" maxlength="50" />
  </label>
  <div class="field">
    <span>Catégorie</span>
    <div class="chips">
      <button
        v-for="c in cats('expense')"
        :key="c.id"
        class="chip"
        :class="{ on: c.id === F.categoryId }"
        :style="{ '--c': c.color }"
        @click="F.categoryId = c.id"
      >
        <Icon :name="c.icon" :size="16" />
        {{ c.name }}
      </button>
    </div>
  </div>
  <button class="primary" data-a="uvsave" @click="save">Enregistrer la dépense</button>
</template>
