<script setup>
import Icon from './Icon.vue';
import { getCat, money } from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const props = defineProps({ t: Object });
const ui = useUI();
</script>
<template>
  <button class="tx" @click="ui.open('TxSheet', { id: t.id })">
    <span class="ico" :style="{ '--c': getCat(t.categoryId).color }">
      <Icon :name="getCat(t.categoryId).icon" />
    </span>
    <span class="mid">
      <span class="t1">{{ t.note || getCat(t.categoryId).name }}</span>
      <span class="t2">
        {{ t.note ? getCat(t.categoryId).name : t.type === 'income' ? 'Revenu' : 'Dépense'
        }}{{ t.list ? ' · depuis ta liste' : '' }}{{ t.vault ? ' · payé par un coffre' : '' }}
      </span>
    </span>
    <span class="amt num" :class="{ pos: t.type === 'income' }">
      {{ t.type === 'income' ? '+' : '−' }}{{ money(t.amount) }}
    </span>
  </button>
</template>
