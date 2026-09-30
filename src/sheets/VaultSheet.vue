<script setup>
import { reactive, computed } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import IconGrid from '../components/IconGrid.vue';
import Swatches from '../components/Swatches.vue';
import {
  S,
  COLORS,
  uid,
  today,
  ds,
  curKey,
  monthsBetween,
  amtStr,
  parseAmount,
  curSym,
  money0,
  activeGoal,
  vaultBalance,
  vaultSaved,
  vaultUsed,
  vaultNeed
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';
import { deposit } from '../actions.js';
const props = defineProps({ id: String });
const ui = useUI();
const v = computed(() => (props.id ? S.vaults.find(x => x.id === props.id) : null));
const d = new Date();
d.setMonth(d.getMonth() + 3);
const F = reactive(
  v.value
    ? {
        name: v.value.name,
        target: amtStr(v.value.target),
        dueDate: v.value.dueDate,
        icon: v.value.icon,
        color: v.value.color
      }
    : { name: '', target: '', dueDate: ds(d), icon: 'gift', color: COLORS[7] }
);
const calc = computed(() => {
  const t = parseAmount(F.target);
  if (!(t > 0) || !F.dueDate) return '';
  const left = Math.max(1, monthsBetween(curKey(), F.dueDate.slice(0, 7)) + 1);
  return `Soit ${money0(t / left)} par mois pendant ${left} mois, retirés de ton budget du quotidien.`;
});
function save() {
  const n = F.name.trim(),
    t = parseAmount(F.target);
  if (!n) return ui.toast('Donne un nom au coffre');
  if (!(t > 0)) return ui.toast('Montant invalide');
  if (!F.dueDate) return ui.toast('Choisis une date');
  const old = v.value;
  const rec = {
    id: old ? old.id : uid(),
    name: n,
    target: t,
    dueDate: F.dueDate,
    icon: F.icon,
    color: F.color,
    createdAt: old ? old.createdAt : today(),
    deposits: old ? old.deposits : [],
    uses: old ? old.uses : [],
    closedAt: old ? old.closedAt : null
  };
  if (old) Object.assign(old, rec);
  else S.vaults.push(rec);
  ui.close();
  ui.toast('Coffre enregistré', `${money0(vaultNeed(rec, curKey()))} à mettre de côté ce mois`);
}
async function closeVault() {
  const x = v.value;
  const left = vaultBalance(x);
  x.closedAt = today();
  const g = activeGoal();
  if (
    left > 0.5 &&
    g &&
    (await ui.ask(
      `Il reste ${money0(left)} dans ce coffre. Les verser à « ${g.name} » ?`,
      'Verser au rêve'
    ))
  ) {
    x.uses.push({ date: today(), amount: left, toGoal: true });
    deposit(left, `Reste du coffre ${x.name}`, 'vault');
  } else ui.close();
}
async function del() {
  if (await ui.ask('Supprimer ce coffre et son historique ?')) {
    S.vaults = S.vaults.filter(x => x.id !== props.id);
    ui.close();
  }
}
</script>
<template>
  <SheetHead :title="v ? v.name : 'Nouveau coffre'" />
  <div v-if="v" class="statline">
    <div class="fact">
      <div class="k">Dans le coffre</div>
      <div class="v">{{ money0(vaultBalance(v)) }}</div>
    </div>
    <div class="fact">
      <div class="k">Versé</div>
      <div class="v">{{ money0(vaultSaved(v)) }}</div>
    </div>
    <div class="fact">
      <div class="k">Utilisé</div>
      <div class="v">{{ money0(vaultUsed(v)) }}</div>
    </div>
  </div>
  <label class="field">
    <span>Pour quoi ?</span>
    <input
      id="vName"
      v-model="F.name"
      maxlength="40"
      placeholder="Cadeaux de Noël, vêtements d’hiver…"
    />
  </label>
  <div class="two">
    <label class="field">
      <span>Montant ({{ curSym() }})</span>
      <input id="vTarget" v-model="F.target" inputmode="decimal" placeholder="200" />
    </label>
    <label class="field">
      <span>Pour quand</span>
      <input id="vDue" v-model="F.dueDate" type="date" />
    </label>
  </div>
  <div class="calc small muted">{{ calc }}</div>
  <div class="field">
    <span>Icône</span>
    <IconGrid v-model="F.icon" :color="F.color" />
  </div>
  <div class="field">
    <span>Couleur</span>
    <Swatches v-model="F.color" />
  </div>
  <button class="primary" data-a="vsave" @click="save">Enregistrer</button>
  <button v-if="v && !v.closedAt" class="secondary" @click="closeVault">Clôturer ce coffre</button>
  <button v-if="v" class="danger" @click="del">Supprimer</button>
</template>
