<script setup>
import { reactive } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import IconGrid from '../components/IconGrid.vue';
import Swatches from '../components/Swatches.vue';
import { S, COLORS, uid, cats, amtStr, parseAmount, curSym } from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const props = defineProps({ id: String, type: String });
const ui = useUI();
const c = props.id ? S.categories.find(x => x.id === props.id) : null;
const F = reactive(
  c
    ? { ...c, budget: amtStr(c.budget) }
    : {
        id: null,
        type: props.type || 'expense',
        name: '',
        icon: 'tag',
        color: COLORS[S.categories.length % COLORS.length],
        budget: ''
      }
);
function save() {
  const n = F.name.trim();
  if (!n) return ui.toast('Donne un nom');
  const b = String(F.budget).trim() ? parseAmount(F.budget) : 0;
  const rec = {
    id: F.id || 'c-' + uid(),
    type: F.type,
    name: n,
    icon: F.icon,
    color: F.color,
    budget: b >= 0 ? b : 0
  };
  const i = S.categories.findIndex(x => x.id === rec.id);
  if (i >= 0) S.categories[i] = rec;
  else S.categories.push(rec);
  ui.close();
}
async function del() {
  const same = cats(F.type).filter(x => x.id !== F.id);
  if (!same.length) return ui.toast('Garde au moins une catégorie');
  const fb = same.find(x => /autre/i.test(x.name)) || same[0];
  const used = S.transactions.filter(t => t.categoryId === F.id);
  if (
    !(await ui.ask(
      used.length
        ? `${used.length} opération(s) iront dans « ${fb.name} ». Supprimer ?`
        : 'Supprimer cette catégorie ?'
    ))
  )
    return;
  used.forEach(t => {
    t.categoryId = fb.id;
  });
  S.categories = S.categories.filter(x => x.id !== F.id);
  ui.close();
}
</script>
<template>
  <SheetHead :title="c ? 'Catégorie' : 'Nouvelle catégorie'" />
  <label class="field">
    <span>Nom</span>
    <input id="cName" v-model="F.name" maxlength="40" placeholder="Ex. Coiffeur" />
  </label>
  <label v-if="F.type === 'expense'" class="field">
    <span>Enveloppe mensuelle ({{ curSym() }}) — optionnel</span>
    <input id="cBudget" v-model="F.budget" inputmode="decimal" placeholder="—" />
  </label>
  <div class="field">
    <span>Icône</span>
    <IconGrid v-model="F.icon" :color="F.color" />
  </div>
  <div class="field">
    <span>Couleur</span>
    <Swatches v-model="F.color" />
  </div>
  <button class="primary" @click="save">Enregistrer</button>
  <button v-if="c" class="danger" @click="del">Supprimer</button>
</template>
