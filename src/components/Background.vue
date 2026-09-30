<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { activeGoal, revealOf, penalty, clamp, goalPhoto } from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const ui = useUI();
const target = computed(() => {
  const g = activeGoal();
  return clamp(revealOf(g) - penalty().p, 0, 1);
});
const shown = ref(0);
const anim = ref(true);
const filter = x =>
  `blur(${((1 - x) * 22).toFixed(1)}px) grayscale(${(1 - x).toFixed(2)}) brightness(${(0.78 + x * 0.22).toFixed(2)})`;
async function reveal(from) {
  anim.value = false;
  shown.value = from;
  await nextTick();
  requestAnimationFrame(() => {
    anim.value = true;
    shown.value = target.value;
  });
}
onMounted(() => reveal(0));
watch(target, v => {
  if (ui.revealFrom != null) {
    const f = ui.revealFrom;
    ui.revealFrom = null;
    reveal(f);
  } else shown.value = v;
});
</script>
<template>
  <div id="bg" style="display: block">
    <div
      id="bgimg"
      :style="{
        backgroundImage: `url('${goalPhoto(activeGoal())}')`,
        filter: filter(shown),
        transition: anim ? '' : 'none'
      }"
    />
    <div id="bgshade" />
  </div>
</template>
