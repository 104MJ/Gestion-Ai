<script setup>
import { reactive, computed, onMounted, ref } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import Icon from '../components/Icon.vue';
import Seg from '../components/Seg.vue';
import {
  S,
  uid,
  today,
  mkey,
  curKey,
  amtStr,
  parseAmount,
  curSym,
  cats,
  money,
  impact,
  mod
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';
import { toastForExpense, pushPing } from '../actions.js';
const props = defineProps({ id: String, preset: Object });
const ui = useUI();
const t = props.id ? S.transactions.find(x => x.id === props.id) : null;
const F = reactive(
  t
    ? { ...t, amount: amtStr(t.amount) }
    : {
        id: null,
        type: 'expense',
        amount: '',
        categoryId: null,
        date: today(),
        note: '',
        ...(props.preset || {})
      }
);
if (!F.categoryId && F.type !== 'envie') F.categoryId = cats(F.type)[0].id;
const types = computed(() =>
  [
    ['expense', 'Dépense'],
    ['income', 'Revenu']
  ].concat(mod('envies') ? [['envie', 'Envie']] : [])
);
function setType(v) {
  F.type = v;
  F.categoryId = v === 'envie' ? null : cats(v)[0].id;
}
const isEnv = computed(() => F.type === 'envie');
onMounted(() => {
  if (!t)
    setTimeout(() => {
      const el = document.getElementById(isEnv.value ? 'fNote' : 'fAmount');
      el && el.focus();
    }, 260);
});
function saveTx() {
  const amount = parseAmount(F.amount);
  if (!(amount > 0)) return ui.toast('Entre un montant valide');
  if (isEnv.value) {
    if (!F.note.trim()) return ui.toast('Dis ce que tu veux acheter');
    S.envies.push({
      id: uid(),
      name: F.note.trim(),
      amount,
      createdAt: Date.now(),
      status: 'waiting'
    });
    ui.close();
    return ui.toast('Envie notée. On en reparle dans 72 h.', impact(amount));
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(F.date)) return ui.toast('Choisis une date');
  const rec = {
    id: F.id || uid(),
    type: F.type,
    amount,
    categoryId: F.categoryId,
    date: F.date,
    note: F.note.trim(),
    createdAt: F.createdAt || Date.now()
  };
  ['list', 'vault', 'imported', 'bankLabel', 'fromCheck'].forEach(k => {
    if (t && t[k] != null) rec[k] = t[k];
  });
  const i = S.transactions.findIndex(x => x.id === rec.id);
  if (i >= 0) S.transactions[i] = rec;
  else S.transactions.push(rec);
  if (F.fromEnvie) {
    const e = S.envies.find(x => x.id === F.fromEnvie);
    if (e) {
      e.status = 'bought';
      e.decidedAt = Date.now();
    }
  }
  ui.close();
  pushPing({ logged: today() });
  if (i >= 0) ui.toast('Opération modifiée');
  else if (rec.type === 'income') ui.toast(`+${money(amount)} ajoutés`);
  else toastForExpense(rec, amount);
}
async function del() {
  if (await ui.ask('Supprimer cette opération ?')) {
    S.transactions = S.transactions.filter(x => x.id !== F.id);
    ui.close();
    ui.toast('Opération supprimée');
  }
}
</script>
<template>
  <SheetHead :title="F.id ? 'Modifier' : 'Ajouter'" />
  <Seg v-if="!F.id" :model-value="F.type" :options="types" @update:model-value="setType" />
  <p v-if="isEnv" class="hint" style="margin: 0 0 14px">
    Tu ne dépenses rien maintenant. Dans 72 h, l’appli te demande si tu en as encore envie. Si tu
    renonces, le montant part vers ton rêve.
  </p>
  <form @submit.prevent="saveTx">
    <label class="field">
      <span>{{ isEnv ? 'Ce que tu veux acheter' : 'Note' }}</span>
      <input
        id="fNote"
        v-model="F.note"
        maxlength="60"
        :placeholder="isEnv ? 'Ex. baskets, casque audio…' : 'Ex. courses Carrefour'"
      />
    </label>
    <label class="field">
      <span>Montant ({{ curSym() }})</span>
      <input
        id="fAmount"
        v-model="F.amount"
        class="amount"
        inputmode="decimal"
        placeholder="0,00"
        autocomplete="off"
      />
    </label>
    <template v-if="!isEnv">
      <div class="field">
        <span>Catégorie</span>
        <div class="chips">
          <button
            v-for="c in cats(F.type)"
            :key="c.id"
            type="button"
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
      <label class="field">
        <span>Date</span>
        <input id="fDate" v-model="F.date" type="date" />
      </label>
    </template>
    <button class="primary" data-a="fsave" type="submit">
      {{ isEnv ? 'Noter l’envie' : 'Enregistrer' }}
    </button>
  </form>
  <button v-if="F.id" class="danger" @click="del">Supprimer</button>
</template>
