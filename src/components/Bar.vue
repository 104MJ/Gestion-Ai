<script setup>
import { computed } from 'vue';
const props = defineProps({
  pct: Number,
  thin: Boolean,
  warnAt: { type: Number, default: 85 },
  overAt: { type: Number, default: 100 },
  cls: String
});
const state = computed(
  () => props.cls ?? (props.pct >= props.overAt ? 'over' : props.pct >= props.warnAt ? 'warn' : '')
);
</script>
<template>
  <span class="bar" :class="[state, { thin }]" style="display: block">
    <i :style="{ width: Math.max(0, Math.min(100, pct || 0)).toFixed(1) + '%' }" />
  </span>
</template>
