<script setup>
import { reactive } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import Seg from '../components/Seg.vue';
import { uid, amtStr, parseAmount, curSym, gState, AISLES } from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const props = defineProps({ id: String });
const ui = useUI();
const it = props.id ? gState().items.find(x => x.id === props.id) : null;
const F = reactive(
  it
    ? { ...it, price: amtStr(it.price) }
    : { name: '', aisle: 'Épicerie', rhythm: 'week', price: '', qty: 1 }
);
function save() {
  const n = F.name.trim(),
    p = parseAmount(F.price || '0');
  if (!n) return ui.toast('Donne un nom au produit');
  const rec = {
    id: it ? it.id : uid(),
    name: n,
    aisle: F.aisle,
    rhythm: F.rhythm,
    price: p >= 0 ? p : 0,
    qty: Math.max(1, +F.qty || 1)
  };
  const G = gState();
  const i = G.items.findIndex(x => x.id === rec.id);
  if (i >= 0) G.items[i] = rec;
  else G.items.push(rec);
  ui.open('CatalogSheet', {});
  ui.toast('Produit enregistré');
}
function del() {
  gState().items = gState().items.filter(x => x.id !== props.id);
  ui.open('CatalogSheet', {});
}
</script>
<template>
  <SheetHead :title="it ? 'Produit' : 'Nouveau produit'" />
  <label class="field">
    <span>Nom</span>
    <input v-model="F.name" maxlength="40" placeholder="Ex. riz, lait, lessive" />
  </label>
  <div class="field">
    <span>Quand tu l’achètes</span>
    <Seg
      v-model="F.rhythm"
      :options="[
        ['month', 'Grande course'],
        ['week', 'Chaque semaine']
      ]"
      style="margin: 0"
    />
  </div>
  <div class="two">
    <label class="field">
      <span>Prix habituel ({{ curSym() }})</span>
      <input v-model="F.price" inputmode="decimal" placeholder="0,00" />
    </label>
    <label class="field">
      <span>Quantité</span>
      <input v-model.number="F.qty" type="number" min="1" max="99" />
    </label>
  </div>
  <label class="field">
    <span>Rayon</span>
    <select v-model="F.aisle">
      <option v-for="a in AISLES" :key="a">{{ a }}</option>
    </select>
  </label>
  <button class="primary" @click="save">Enregistrer</button>
  <button v-if="it" class="danger" @click="del">Supprimer</button>
</template>
