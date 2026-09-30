<script setup>
import { computed } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import Icon from '../components/Icon.vue';
import { S, mm, ym, mkey, monthName, money, money0, getCat } from '../domain/model.js';
const props = defineProps({ month: String });
const M = computed(() => mm(props.month));
const parts = computed(() => {
  const by = {};
  M.value.txs
    .filter(t => t.type === 'expense')
    .forEach(t => {
      by[t.categoryId] = (by[t.categoryId] || 0) + t.amount;
    });
  return Object.entries(by)
    .map(([id, v]) => ({ c: getCat(id), v }))
    .sort((a, b) => b.v - a.v);
});
const R = 15.9155;
const segs = computed(() => {
  let acc = 0;
  const gap = parts.value.length > 1 ? 0.6 : 0;
  return parts.value.map(p => {
    const pc = (p.v / M.value.spent) * 100,
      len = Math.max(pc - gap, 0.01);
    const s = {
      color: p.c.color,
      da: `${len.toFixed(3)} ${(100 - len).toFixed(3)}`,
      off: (-acc).toFixed(3)
    };
    acc += pc;
    return s;
  });
});
const bars = computed(() => {
  const { y, m } = ym(props.month);
  const out = [];
  for (let k = 5; k >= 0; k--) {
    const kk = mkey(y, m - k);
    const X = mm(kk);
    out.push({
      kk,
      e: X.spent + X.A + X.F,
      i: X.incomeTx || (kk >= S.createdAt.slice(0, 7) ? X.M : 0)
    });
  }
  const max = Math.max(1, ...out.map(x => Math.max(x.e, x.i)));
  return { out, max };
});
const W = 320,
  H = 150,
  top = 8,
  base = 124,
  gw = W / 6,
  bw = 15;
const lbl = kk => {
  const { y, m } = ym(kk);
  return new Date(y, m, 1).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
};
</script>
<template>
  <SheetHead :title="monthName(month)" />
  <div class="statline">
    <div class="fact">
      <div class="k">Quotidien</div>
      <div class="v">{{ money0(M.spent) }}</div>
    </div>
    <div class="fact">
      <div class="k">Abonnements</div>
      <div class="v">{{ money0(M.A) }}</div>
    </div>
    <div class="fact">
      <div class="k">Charges</div>
      <div class="v">{{ money0(M.F) }}</div>
    </div>
  </div>
  <template v-if="parts.length">
    <div class="donut-wrap">
      <svg viewBox="0 0 42 42">
        <circle cx="21" cy="21" :r="R" fill="none" stroke="var(--track)" stroke-width="5.2" />
        <circle
          v-for="(s, i) in segs"
          :key="i"
          cx="21"
          cy="21"
          :r="R"
          fill="none"
          :stroke="s.color"
          stroke-width="5.2"
          :stroke-dasharray="s.da"
          :stroke-dashoffset="s.off"
        />
      </svg>
      <div class="donut-center">
        <span class="muted small">Quotidien</span>
        <b>{{ money0(M.spent) }}</b>
      </div>
    </div>
    <div v-for="p in parts" :key="p.c.name" class="legend-row">
      <span class="ico sm" :style="{ '--c': p.c.color }"><Icon :name="p.c.icon" :size="16" /></span>
      <span class="mid">{{ p.c.name }}</span>
      <span class="num">{{ money(p.v) }}</span>
      <span class="pct">{{ Math.round((p.v / M.spent) * 100) }} %</span>
    </div>
  </template>
  <div v-else class="empty">Pas de dépense du quotidien ce mois-là.</div>
  <h3
    class="muted small"
    style="margin: 18px 0 8px; text-transform: uppercase; letter-spacing: 0.06em"
  >
    6 derniers mois
  </h3>
  <div class="bars">
    <svg :viewBox="`0 0 ${W} ${H}`">
      <line
        v-for="f in [0, 0.5, 1]"
        :key="f"
        class="b-grid"
        x1="0"
        :x2="W"
        :y1="base - f * (base - top)"
        :y2="base - f * (base - top)"
      />
      <g v-for="(x, i) in bars.out" :key="x.kk">
        <rect
          class="b-exp"
          :x="gw * i + gw / 2 - bw - 1.5"
          :y="base - (x.e / bars.max) * (base - top)"
          :width="bw"
          :height="(x.e / bars.max) * (base - top)"
          rx="3"
        />
        <rect
          class="b-inc"
          :x="gw * i + gw / 2 + 1.5"
          :y="base - (x.i / bars.max) * (base - top)"
          :width="bw"
          :height="(x.i / bars.max) * (base - top)"
          rx="3"
        />
        <text
          :x="gw * i + gw / 2"
          :y="base + 16"
          text-anchor="middle"
          :style="x.kk === month ? 'fill:var(--text);font-weight:600' : ''"
        >
          {{ lbl(x.kk) }}
        </text>
      </g>
    </svg>
  </div>
  <div class="leg">
    <span>
      <i class="dot" style="--c: var(--accent)" />
      Sorties totales
    </span>
    <span>
      <i class="dot" style="--c: var(--pos)" />
      Revenus
    </span>
  </div>
</template>
