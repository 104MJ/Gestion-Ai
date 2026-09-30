<script setup>
import { COLORS } from '../domain/model.js';
defineProps({ modelValue: String });
defineEmits(['update:modelValue']);
</script>
<template>
  <div class="swatches">
    <button
      v-for="c in COLORS"
      :key="c"
      type="button"
      class="sw"
      :class="{ on: c === modelValue }"
      :style="{ '--c': c }"
      :aria-label="'Couleur ' + c"
      @click="$emit('update:modelValue', c)"
    />
  </div>
</template>
