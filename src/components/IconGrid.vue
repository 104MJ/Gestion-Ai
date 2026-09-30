<script setup>
import Icon from './Icon.vue';
import { CAT_ICONS } from '../domain/model.js';
defineProps({ modelValue: String, color: String });
defineEmits(['update:modelValue']);
</script>
<template>
  <div class="icon-grid">
    <button
      v-for="n in CAT_ICONS"
      :key="n"
      type="button"
      class="icon-pick"
      :class="{ on: n === modelValue }"
      :style="{ '--c': color }"
      :aria-label="n"
      @click="$emit('update:modelValue', n)"
    >
      <Icon :name="n" />
    </button>
  </div>
</template>
