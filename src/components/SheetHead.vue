<script setup>
import Icon from './Icon.vue';
import { useUI } from '../stores/ui.js';
defineProps({ title: String });
const ui = useUI();
</script>
<template>
  <div class="sheet-head">
    <h2>{{ title }}</h2>
    <button class="icon-btn" aria-label="Fermer" @click="ui.close()">
      <Icon name="x" :size="22" />
    </button>
  </div>
</template>
