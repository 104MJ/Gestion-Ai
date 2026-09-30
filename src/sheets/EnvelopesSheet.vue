<script setup>
import { reactive, computed } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import Icon from '../components/Icon.vue';
import { S, sum, mm, curKey, cats, amtStr, parseAmount, money0 } from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const ui = useUI();
const M = mm(curKey());
const vals = reactive(Object.fromEntries(cats('expense').map(c => [c.id, amtStr(c.budget)])));
const total = computed(() => sum(Object.values(vals), v => parseAmount(v) || 0));
function save() {
  cats('expense').forEach(c => {
    const v = String(vals[c.id] || '').trim() ? parseAmount(vals[c.id]) : 0;
    if (v >= 0) c.budget = v;
  });
  ui.close();
  ui.toast('Enveloppes enregistrées');
}
</script>
<template>
  <SheetHead title="Enveloppes du mois" />
  <p class="hint" style="margin: 0 0 14px">
    Ton budget du quotidien est de {{ money0(M.Bfull) }} par mois. Répartis-le entre tes catégories
    ; laisse vide pour ne pas suivre une catégorie.
  </p>
  <label v-for="c in cats('expense')" :key="c.id" class="envin">
    <span class="ico sm" :style="{ '--c': c.color }"><Icon :name="c.icon" :size="16" /></span>
    <span class="mid">{{ c.name }}</span>
    <input v-model="vals[c.id]" inputmode="decimal" placeholder="—" />
  </label>
  <div class="row small" style="margin: 12px 0">
    <span class="muted">Total réparti</span>
    <b class="num" :class="{ warnc: total > M.Bfull + 1 }">{{ money0(total) }}</b>
  </div>
  <button class="primary" @click="save">Enregistrer</button>
</template>
