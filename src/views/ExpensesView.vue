<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import Bar from '../components/Bar.vue';
import TxRow from '../components/TxRow.vue';
import {
  S,
  sum,
  mm,
  mkey,
  ym,
  curKey,
  monthName,
  today,
  dayLong,
  money,
  money0,
  cats,
  getCat,
  mod,
  openVaults,
  vaultBalance,
  vaultNeed
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';

const ui = useUI();
const router = useRouter();
const jm = ref(ym(curKey()));
const filter = ref(null);
const key = computed(() => mkey(jm.value.y, jm.value.m));
const M = computed(() => mm(key.value));
function shift(d) {
  const x = new Date(jm.value.y, jm.value.m + d, 1);
  jm.value = { y: x.getFullYear(), m: x.getMonth() };
}
const left = computed(() => M.value.M - M.value.F - M.value.A - M.value.spent);
const p = computed(() => (M.value.B > 0 ? (M.value.spentTracked / M.value.B) * 100 : 0));
const by = computed(() => {
  const o = {};
  M.value.txs
    .filter(t => t.type === 'expense')
    .forEach(t => {
      o[t.categoryId] = (o[t.categoryId] || 0) + t.amount;
    });
  return o;
});
const envCats = computed(() =>
  cats('expense')
    .filter(c => c.budget > 0 || by.value[c.id])
    .sort(
      (a, b) => (b.budget > 0) - (a.budget > 0) || (by.value[b.id] || 0) - (by.value[a.id] || 0)
    )
);
const totEnv = computed(() => sum(cats('expense'), c => c.budget || 0));
const vaultsInfo = computed(() => {
  const vs = openVaults();
  return { n: vs.length, bal: sum(vs, vaultBalance), need: sum(vs, v => vaultNeed(v, curKey())) };
});
const items = computed(() => {
  let txs = M.value.txs;
  if (filter.value) txs = txs.filter(t => t.categoryId === filter.value);
  const arr = txs
    .map(t => ({ kind: 'tx', date: t.date, t, ord: t.createdAt || 0 }))
    .concat(
      filter.value ? [] : M.value.subDebits.map(x => ({ kind: 'sub', date: x.date, x, ord: 0 }))
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.ord - a.ord);
  const groups = [];
  arr.forEach(it => {
    let g = groups[groups.length - 1];
    if (!g || g.date !== it.date) groups.push((g = { date: it.date, items: [] }));
    g.items.push(it);
  });
  groups.forEach(g => {
    g.total = sum(
      g.items.filter(i => i.kind === 'tx' && i.t.type === 'expense'),
      i => i.t.amount
    );
  });
  return groups;
});
</script>

<template>
  <div class="vhead">
    <div><h1>Dépenses</h1></div>
    <div class="monthnav">
      <button class="icon-btn" aria-label="Mois précédent" @click="shift(-1)">
        <Icon name="left" :size="22" />
      </button>
      <span>{{ monthName(key) }}</span>
      <button class="icon-btn" aria-label="Mois suivant" @click="shift(1)">
        <Icon name="right" :size="22" />
      </button>
    </div>
  </div>

  <div class="card">
    <div class="row">
      <div>
        <div class="muted small">Dépenses du quotidien</div>
        <div class="big2 num">
          {{ money0(M.spent) }}
          <span v-if="M.B > 0" class="muted">/ {{ money0(M.B) }}</span>
        </div>
      </div>
      <span
        v-if="M.B > 0"
        class="badge"
        :class="p >= 100 ? 'b-cancel' : p >= 85 ? 'b-question' : 'b-keep'"
      >
        {{ Math.round(p) }} %
      </span>
    </div>
    <Bar v-if="M.B > 0" :pct="p" />
    <div class="sumgrid" style="margin-top: 12px">
      <div>
        <div class="k">Revenus</div>
        <div class="v pos">{{ money0(M.M) }}</div>
      </div>
      <div>
        <div class="k">Solde avant épargne</div>
        <div class="v" :class="left >= 0 ? 'pos' : 'neg'">
          {{ left > 0 ? '+' : '' }}{{ money0(left) }}
        </div>
      </div>
      <div>
        <div class="k">Charges fixes</div>
        <div class="v">{{ money0(M.F) }}</div>
      </div>
      <div>
        <div class="k">Abonnements</div>
        <div class="v">{{ money0(M.A) }}</div>
      </div>
    </div>
  </div>

  <button v-if="mod('vaults')" class="card vaultcard" @click="router.push('/coffres')">
    <span class="ico" style="--c: #e86fa8"><Icon name="gift" /></span>
    <span class="mid">
      <b>Coffres</b>
      <br />
      <span class="muted small">
        {{
          vaultsInfo.n
            ? `${money0(vaultsInfo.bal)} de côté · ${money0(vaultsInfo.need)} à verser ce mois`
            : 'Cadeaux, vêtements, dentiste… prévois les dépenses rares'
        }}
      </span>
    </span>
    <span class="muted"><Icon name="right" :size="18" /></span>
  </button>

  <div class="card">
    <div class="row" style="margin-bottom: 10px">
      <h3 style="margin: 0">Enveloppes</h3>
      <button class="minibtn ghost" @click="ui.open('EnvelopesSheet', {})">Ajuster</button>
    </div>
    <p v-if="!totEnv" class="muted small" style="margin: 0 0 10px">
      Donne une enveloppe à chaque catégorie (courses, restos, sorties…) pour savoir où tu en es
      d’un coup d’œil.
    </p>
    <p v-else-if="M.B > 0 && totEnv > M.Bfull + 1" class="small warnc" style="margin: 0 0 10px">
      Tes enveloppes ({{ money0(totEnv) }}) dépassent ton budget du quotidien ({{
        money0(M.Bfull)
      }}).
    </p>
    <button
      v-for="c in envCats"
      :key="c.id"
      class="envrow"
      :class="{ sel: filter === c.id }"
      @click="filter = filter === c.id ? null : c.id"
    >
      <span class="ico sm" :style="{ '--c': c.color }"><Icon :name="c.icon" :size="16" /></span>
      <span class="mid">
        <span class="row">
          <span>{{ c.name }}</span>
          <span class="num small">
            {{ money0(by[c.id] || 0) }}
            <span v-if="c.budget > 0" class="muted">/ {{ money0(c.budget) }}</span>
          </span>
        </span>
        <Bar
          v-if="c.budget > 0"
          thin
          :pct="((by[c.id] || 0) / c.budget) * 100"
          style="margin: 6px 0 0"
        />
        <span v-else class="muted small">Sans enveloppe</span>
      </span>
    </button>
  </div>

  <div class="card">
    <div class="row" style="margin-bottom: 10px">
      <h3 style="margin: 0">Opérations</h3>
      <button
        v-if="filter"
        class="chip on"
        :style="{ '--c': getCat(filter).color }"
        @click="filter = null"
      >
        {{ getCat(filter).name }}
        <Icon name="x" :size="14" />
      </button>
    </div>
    <div v-if="!items.length" class="empty">
      <b><Icon name="receipt" :size="32" /></b>
      Rien {{ filter ? 'dans cette catégorie' : '' }} ce mois-ci.
      <br />
      Touche + pour ajouter une dépense.
    </div>
    <template v-for="g in items" :key="g.date">
      <div class="day row">
        <span>{{ dayLong(g.date) }}</span>
        <span v-if="g.total" class="num">−{{ money0(g.total) }}</span>
      </div>
      <template v-for="it in g.items" :key="it.kind === 'tx' ? it.t.id : it.x.sub.id + it.date">
        <TxRow v-if="it.kind === 'tx'" :t="it.t" />
        <button v-else class="tx auto" @click="ui.open('SubSheet', { id: it.x.sub.id })">
          <span class="ico" :style="{ '--c': it.x.sub.color }"><Icon :name="it.x.sub.icon" /></span>
          <span class="mid">
            <span class="t1">{{ it.x.sub.name }}</span>
            <span class="t2">
              Abonnement · prélèvement {{ it.date > today() ? 'prévu' : 'auto' }}
            </span>
          </span>
          <span class="amt num">−{{ money(it.x.sub.price) }}</span>
        </button>
      </template>
    </template>
  </div>
</template>
