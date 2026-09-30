<script setup>
import { computed } from 'vue';
import {
  S,
  ym,
  mkey,
  curKey,
  monthName,
  monthsBetween,
  money0,
  chapterData,
  activeGoal,
  revealOf,
  goalPhoto
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';
import { deposit } from '../actions.js';
const ui = useUI();
const start = computed(() => S.createdAt.slice(0, 7));
const g = computed(() => activeGoal());
const chapters = computed(() => {
  const n = monthsBetween(start.value, curKey());
  const { y, m } = ym(start.value);
  const out = [];
  for (let i = n; i >= 0; i--) {
    const key = mkey(y, m + i);
    out.push({ i, key, C: chapterData(key) });
  }
  return out;
});
function closeMonth(key, left) {
  S.closedMonths = { ...S.closedMonths, [key]: true };
  deposit(Math.round(left * 100) / 100, `Reste de ${monthName(key).toLowerCase()}`, 'month');
}
</script>

<template>
  <div class="vhead">
    <div>
      <h1>Ton histoire</h1>
      <div class="sub">
        {{ chapters.length }} chapitre{{ chapters.length > 1 ? 's' : '' }} depuis
        {{ monthName(start).toLowerCase() }}
      </div>
    </div>
  </div>
  <div v-for="(ch, idx) in chapters" :key="ch.key" class="card chap">
    <div
      v-if="idx === 0 && g"
      class="cover"
      :style="{
        backgroundImage: `url('${goalPhoto(g)}')`,
        filter: `grayscale(${1 - revealOf(g)})`
      }"
    />
    <span v-if="ch.C.isCur" class="cur">EN COURS</span>
    <div class="kicker">Chapitre {{ ch.i + 1 }}</div>
    <h2>{{ monthName(ch.key) }}</h2>
    <div class="mood">{{ ch.C.mood }}</div>
    <div class="dots">
      <i
        v-for="d in ch.C.M.daysArr"
        :key="d.date"
        :class="!d.tracked ? 'f' : d.future ? '' : d.held ? 'h' : 'x'"
      />
    </div>
    <div class="story"><p v-for="(l, j) in ch.C.L" :key="j" v-html="l" /></div>
    <div class="row">
      <button class="link" @click="ui.open('ChapterSheet', { month: ch.key })">
        Voir les chiffres →
      </button>
      <button
        v-if="!ch.C.isCur && ch.C.leftover > 0 && g && !S.closedMonths[ch.key]"
        class="minibtn"
        @click="closeMonth(ch.key, ch.C.leftover)"
      >
        Verser {{ money0(ch.C.leftover) }} au rêve
      </button>
    </div>
  </div>
</template>
