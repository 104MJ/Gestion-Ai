<script setup>
import { computed } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import Icon from '../components/Icon.vue';
import { S, COLORS, today, pd, money0, openDebts, debtLeft, activeGoal } from '../domain/model.js';
import { useUI } from '../stores/ui.js';
import { deposit } from '../actions.js';
const ui = useUI();
const od = computed(() => openDebts());
const done = computed(() =>
  S.debts
    .filter(d => d.settledAt)
    .slice(-5)
    .reverse()
);
const age = d => Math.round((pd(today()) - pd(d.date)) / 864e5);
async function paid(d) {
  const left = debtLeft(d);
  d.paid = (d.paid || []).concat({ date: today(), amount: left });
  d.settledAt = today();
  const g = activeGoal();
  if (
    g &&
    (await ui.ask(
      `${d.who} t’a rendu ${money0(left)}. Verser cette somme à « ${g.name} » ?`,
      'Verser au rêve'
    ))
  )
    deposit(left, `Récupéré : ${d.who}`, 'debt');
  else ui.toast(`+${money0(left)} récupérés`);
}
</script>
<template>
  <SheetHead title="On me doit" />
  <p class="hint" style="margin: 0 0 10px">
    Argent prêté à quelqu’un, remboursement Sécu ou mutuelle, retour de colis en attente…
  </p>
  <div v-for="d in od" :key="d.id" class="debt">
    <button class="head" @click="ui.open('DebtSheet', { id: d.id })">
      <span class="ico sm" :style="{ '--c': d.type === 'refund' ? COLORS[6] : COLORS[7] }">
        <Icon :name="d.type === 'refund' ? 'receipt' : 'heart'" :size="16" />
      </span>
      <span class="mid">
        <b>{{ d.who }}</b>
        <br />
        <span class="muted small">
          {{ d.reason || (d.type === 'refund' ? 'Remboursement' : 'Prêt') }} ·
          {{ age(d) === 0 ? 'aujourd’hui' : `il y a ${age(d)} j` }}
          <span v-if="age(d) > 30" class="warnc">· ça traîne</span>
        </span>
      </span>
      <span class="num">{{ money0(debtLeft(d)) }}</span>
    </button>
    <div class="acts">
      <button class="minibtn" data-a="debtpaid" @click="paid(d)">
        <Icon name="check" :size="14" />
        Récupéré
      </button>
      <button class="minibtn ghost" @click="ui.open('DebtPartSheet', { id: d.id })">
        Une partie
      </button>
    </div>
  </div>
  <div v-if="!od.length" class="empty">Personne ne te doit rien.</div>
  <button class="primary" style="margin-top: 12px" @click="ui.open('DebtSheet', {})">
    <Icon name="plus" :size="18" />
    Noter une somme due
  </button>
  <template v-if="done.length">
    <h3
      class="muted small"
      style="margin: 18px 0 6px; text-transform: uppercase; letter-spacing: 0.06em"
    >
      Récupéré récemment
    </h3>
    <div v-for="d in done" :key="d.id" class="row small" style="padding: 6px 0">
      <span>{{ d.who }} · {{ d.reason }}</span>
      <span class="pos num">+{{ money0(d.amount) }}</span>
    </div>
  </template>
</template>
