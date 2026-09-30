<script setup>
defineProps({ modelValue: [String, Number, Boolean], options: Array, toggle: Boolean });
const emit = defineEmits(['update:modelValue']);
</script>
<template>
  <div class="seg">
    <button
      v-for="[v, l] in options"
      :key="String(v)"
      type="button"
      :class="{ on: modelValue === v }"
      @click="emit('update:modelValue', toggle && modelValue === v ? '' : v)"
    >
      {{ l }}
    </button>
  </div>
</template>
