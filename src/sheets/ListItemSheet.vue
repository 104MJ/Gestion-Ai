<script setup>
import { reactive } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import Seg from '../components/Seg.vue';
import { amtStr, parseAmount, curSym, gState, getList } from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const props = defineProps({ listKey: String, id: String });
const ui = useUI();
const L = getList(props.listKey);
const i = L.items.find(x => x.id === props.id);
const F = reactive({ price: amtStr(i.price), qty: i.qty || 1, offList: !!i.offList });
function save() {
  const p = parseAmount(F.price || '0');
  if (!(p >= 0)) return ui.toast('Prix invalide');
  i.price = p;
  i.qty = Math.max(1, +F.qty || 1);
  i.offList = F.offList;
  const it = i.itemId && gState().items.find(x => x.id === i.itemId);
  if (it) it.price = p;
  ui.close();
}
function del() {
  L.items = L.items.filter(x => x.id !== props.id);
  ui.close();
}
</script>
<template>
  <SheetHead :title="i.name" />
  <div class="two">
    <label class="field">
      <span>Prix ({{ curSym() }})</span>
      <input v-model="F.price" inputmode="decimal" />
    </label>
    <label class="field">
      <span>Quantité</span>
      <input v-model.number="F.qty" type="number" min="1" max="99" />
    </label>
  </div>
  <p v-if="i.itemId" class="hint">Le prix est aussi mis à jour dans tes produits.</p>
  <div class="field">
    <span>Hors liste</span>
    <Seg
      v-model="F.offList"
      :options="[
        [false, 'Prévu'],
        [true, 'Ajouté en magasin']
      ]"
      style="margin: 0"
    />
  </div>
  <button class="primary" @click="save">Enregistrer</button>
  <button class="danger" @click="del">Retirer de la liste</button>
</template>
