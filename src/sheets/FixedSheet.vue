<script setup>
import { reactive } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import IconGrid from '../components/IconGrid.vue';
import { S, uid, clamp, amtStr, parseAmount, curSym } from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const props = defineProps({ id: String });
const ui = useUI();
const f = props.id ? S.fixed.find(x => x.id === props.id) : null;
const F = reactive(
  f
    ? { ...f, amount: amtStr(f.amount), day: f.day || 1 }
    : { id: null, name: '', amount: '', icon: 'home', day: 1 }
);
function save() {
  const n = F.name.trim(),
    v = parseAmount(F.amount);
  if (!n) return ui.toast('Donne un nom');
  if (!(v > 0)) return ui.toast('Montant invalide');
  const rec = {
    id: F.id || uid(),
    name: n,
    amount: v,
    icon: F.icon,
    day: clamp(+F.day || 1, 1, 31)
  };
  const i = S.fixed.findIndex(x => x.id === rec.id);
  if (i >= 0) S.fixed[i] = rec;
  else S.fixed.push(rec);
  ui.close();
  ui.toast('Charge enregistrée');
}
function del() {
  S.fixed = S.fixed.filter(x => x.id !== F.id);
  ui.close();
}
</script>
<template>
  <SheetHead :title="f ? 'Charge fixe' : 'Nouvelle charge fixe'" />
  <label class="field">
    <span>Nom</span>
    <input id="xName" v-model="F.name" maxlength="40" placeholder="Loyer, assurance, forfait…" />
  </label>
  <div class="two">
    <label class="field">
      <span>Montant mensuel ({{ curSym() }})</span>
      <input id="xAmount" v-model="F.amount" inputmode="decimal" placeholder="0,00" />
    </label>
    <label class="field">
      <span>Prélevé le (jour)</span>
      <input id="xDay" v-model.number="F.day" type="number" min="1" max="31" />
    </label>
  </div>
  <div class="field">
    <span>Icône</span>
    <IconGrid v-model="F.icon" color="var(--accent)" />
  </div>
  <button class="primary" @click="save">Enregistrer</button>
  <button v-if="f" class="danger" @click="del">Supprimer</button>
</template>
