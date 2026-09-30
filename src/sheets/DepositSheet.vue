<script setup>
import { ref, onMounted } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import Icon from '../components/Icon.vue';
import { parseAmount, curSym, money0, savedOf, activeGoal } from '../domain/model.js';
import { useUI } from '../stores/ui.js';
import { deposit } from '../actions.js';
const ui = useUI();
const g = activeGoal();
const amount = ref('');
const note = ref('');
const inp = ref(null);
onMounted(() => setTimeout(() => inp.value && inp.value.focus(), 260));
function save() {
  const v = parseAmount(amount.value);
  if (!(v > 0)) return ui.toast('Entre un montant valide');
  deposit(v, note.value.trim() || 'Versement', 'manual');
}
</script>
<template>
  <SheetHead title="Mettre de côté" />
  <p class="hint" style="margin: 0 0 14px">
    Vers « {{ g && g.name }} ». Il reste {{ g ? money0(Math.max(0, g.target - savedOf(g))) : '' }} à
    réunir.
  </p>
  <form @submit.prevent="save">
    <label class="field">
      <span>Montant ({{ curSym() }})</span>
      <input
        id="dAmount"
        ref="inp"
        v-model="amount"
        class="amount"
        inputmode="decimal"
        placeholder="0,00"
      />
    </label>
    <label class="field">
      <span>Note</span>
      <input id="dNote" v-model="note" maxlength="50" placeholder="Optionnel" />
    </label>
    <button class="primary" data-a="dsave" type="submit">
      <Icon name="piggy" :size="18" />
      Verser
    </button>
  </form>
</template>
