<script setup>
import SheetHead from '../components/SheetHead.vue';
import Icon from '../components/Icon.vue';
import { sum, money, money0, gState, lineTotal } from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const ui = useUI();
const groups = [
  ['month', 'Grande course du mois'],
  ['week', 'Chaque semaine']
];
</script>
<template>
  <SheetHead title="Mes produits" />
  <p class="hint" style="margin: 0 0 4px">
    Ce que tu achètes d’habitude. Chaque nouvelle liste part de là, et les prix se mettent à jour
    quand tu les corriges pendant les courses.
  </p>
  <template v-for="[rh, t] in groups" :key="rh">
    <h3
      class="muted small"
      style="margin: 16px 0 4px; text-transform: uppercase; letter-spacing: 0.06em"
    >
      {{ t }} ·
      {{
        money0(
          sum(
            gState().items.filter(i => i.rhythm === rh),
            lineTotal
          )
        )
      }}
    </h3>
    <button
      v-for="i in gState().items.filter(x => x.rhythm === rh)"
      :key="i.id"
      class="list-btn"
      @click="ui.open('ProductSheet', { id: i.id })"
    >
      <span class="mid">
        {{ i.name }}
        <span v-if="i.qty > 1" class="muted">×{{ i.qty }}</span>
        <br />
        <span class="muted small">{{ i.aisle }}</span>
      </span>
      <span class="num">{{ money(lineTotal(i)) }}</span>
    </button>
  </template>
  <button class="primary" style="margin-top: 14px" @click="ui.open('ProductSheet', {})">
    <Icon name="plus" :size="18" />
    Ajouter un produit
  </button>
</template>
