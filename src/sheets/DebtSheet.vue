<script setup>
import { reactive } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import Seg from '../components/Seg.vue';
import { S, uid, today, amtStr, parseAmount, curSym } from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const props = defineProps({ id: String });
const ui = useUI();
const d = props.id ? S.debts.find(x => x.id === props.id) : null;
const F = reactive(
  d
    ? { ...d, amount: amtStr(d.amount) }
    : { type: 'person', who: '', reason: '', amount: '', date: today() }
);
function save() {
  const who = F.who.trim(),
    amt = parseAmount(F.amount);
  if (!who) return ui.toast('Indique qui te doit');
  if (!(amt > 0)) return ui.toast('Montant invalide');
  const rec = {
    id: d ? d.id : uid(),
    type: F.type,
    who,
    amount: amt,
    reason: F.reason.trim(),
    date: F.date || today(),
    paid: d ? d.paid : [],
    settledAt: d ? d.settledAt : null
  };
  if (d) Object.assign(d, rec);
  else S.debts.push(rec);
  ui.open('DebtsSheet', {});
  ui.toast('Noté');
}
function del() {
  S.debts = S.debts.filter(x => x.id !== props.id);
  ui.open('DebtsSheet', {});
}
</script>
<template>
  <SheetHead :title="d ? 'Somme due' : 'Noter une somme due'" />
  <Seg
    v-model="F.type"
    :options="[
      ['person', 'Prêt à quelqu’un'],
      ['refund', 'Remboursement']
    ]"
  />
  <label class="field">
    <span>{{ F.type === 'refund' ? 'Organisme ou magasin' : 'Qui ?' }}</span>
    <input
      id="dbWho"
      v-model="F.who"
      maxlength="40"
      :placeholder="F.type === 'refund' ? 'Mutuelle, Ameli, Zalando…' : 'Prénom'"
    />
  </label>
  <div class="two">
    <label class="field">
      <span>Montant ({{ curSym() }})</span>
      <input id="dbAmount" v-model="F.amount" inputmode="decimal" />
    </label>
    <label class="field">
      <span>Depuis le</span>
      <input id="dbDate" v-model="F.date" type="date" />
    </label>
  </div>
  <label class="field">
    <span>Pour quoi</span>
    <input
      id="dbReason"
      v-model="F.reason"
      maxlength="50"
      :placeholder="
        F.type === 'refund' ? 'Consultation, colis retourné…' : 'Resto, place de concert…'
      "
    />
  </label>
  <p v-if="F.type === 'person'" class="hint">
    Pour le point hebdo, on considère que cet argent est sorti de ton compte à cette date.
  </p>
  <button class="primary" @click="save">Enregistrer</button>
  <button v-if="d" class="danger" @click="del">Supprimer</button>
</template>
