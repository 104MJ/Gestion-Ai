<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import Bar from '../components/Bar.vue';
import {
  S,
  sum,
  uid,
  today,
  pd,
  ym,
  mkey,
  dim,
  pad,
  curKey,
  monthName,
  dayShort,
  money0,
  clamp,
  activeSubs,
  occurrences,
  openVaults,
  vaultBalance,
  vaultSaved,
  vaultUsed,
  vaultNeed,
  vaultTodo
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const ui = useUI();
const router = useRouter();
const key = curKey();
const vs = computed(() =>
  openVaults()
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
);
const todo = computed(() => sum(vs.value, v => vaultTodo(v, key)));
const need = computed(() => sum(vs.value, v => vaultNeed(v, key)));
const closed = computed(() => S.vaults.filter(v => v.closedAt));
const fill = (v, amt) => {
  if (amt > 0) v.deposits.push({ id: uid(), date: today(), amount: Math.round(amt * 100) / 100 });
};
function fillOne(v) {
  const td = vaultTodo(v);
  fill(v, td);
  ui.toast(`+${money0(td)} dans « ${v.name} »`);
}
function fillAll() {
  let t = 0;
  vs.value.forEach(v => {
    const td = vaultTodo(v);
    t += td;
    fill(v, td);
  });
  ui.toast(
    `${money0(t)} rangés dans tes coffres`,
    'Pense à faire le virement vers ton compte épargne.'
  );
}
const daysTo = v => Math.round((pd(v.dueDate) - pd(today())) / 864e5);
const when = v => {
  const d = daysTo(v);
  return d < 0
    ? 'échéance passée'
    : d === 0
      ? 'aujourd’hui'
      : d < 45
        ? `dans ${d} j`
        : `dans ${Math.round(d / 30.44)} mois`;
};
const forecast = computed(() => {
  const { y, m } = ym(curKey());
  const rows = [];
  for (let k = 1; k <= 3; k++) {
    const kk = mkey(y, m + k);
    const { y: yy, m: m2 } = ym(kk);
    const from = `${kk}-01`,
      to = `${kk}-${pad(dim(yy, m2))}`;
    const F = sum(S.fixed, f => f.amount);
    const debits = [];
    activeSubs().forEach(s => occurrences(s, from, to).forEach(() => debits.push(s)));
    const A = sum(debits, s => s.price);
    const V = sum(openVaults(), v => vaultNeed(v, kk));
    const big = debits.filter(s => s.freq === 'year');
    const dues = openVaults().filter(v => v.dueDate.startsWith(kk));
    const total = F + A + V + (S.savingsPlan || 0);
    const heavy =
      big.length ||
      dues.some(v => vaultSaved(v) < v.target * 0.9) ||
      (S.income && total > S.income * 0.75);
    rows.push({ key: kk, total, A, V, big, dues, heavy });
  }
  return rows;
});
</script>

<template>
  <div class="vhead">
    <button class="icon-btn" aria-label="Retour" @click="router.push('/depenses')">
      <Icon name="left" :size="24" />
    </button>
    <div style="flex: 1">
      <h1>Coffres</h1>
      <div class="sub">Pour les dépenses qui ne tombent pas tous les mois</div>
    </div>
  </div>

  <div v-if="!vs.length" class="card">
    <div class="empty">
      <b><Icon name="gift" :size="32" /></b>
      Cadeaux de Noël, vêtements d’hiver, dentiste, billets de vacances… Ces dépenses sont
      prévisibles mais pas mensuelles. Crée un coffre : l’appli calcule combien mettre de côté
      chaque mois et le retire de ton budget du quotidien.
    </div>
    <button class="primary" @click="ui.open('VaultSheet', {})">
      <Icon name="plus" :size="18" />
      Créer un coffre
    </button>
  </div>
  <template v-else>
    <div class="card">
      <div class="row">
        <div>
          <div class="muted small">À mettre de côté ce mois</div>
          <div class="big2 num">{{ money0(need) }}</div>
        </div>
        <button v-if="todo > 0.5" class="minibtn" @click="fillAll">
          Tout remplir · {{ money0(todo) }}
        </button>
        <span v-else class="badge b-keep">Fait ce mois</span>
      </div>
      <div class="muted small" style="margin-top: 6px">
        Dans tes coffres aujourd’hui : {{ money0(sum(vs, vaultBalance)) }}
      </div>
    </div>
    <div class="card">
      <h3>Mes coffres</h3>
      <div v-for="v in vs" :key="v.id" class="subcard">
        <button class="head" @click="ui.open('VaultSheet', { id: v.id })">
          <span class="ico" :style="{ '--c': v.color }"><Icon :name="v.icon" /></span>
          <span class="mid">
            <span class="name">{{ v.name }}</span>
            <br />
            <span class="meta">
              {{ money0(v.target) }} pour le {{ dayShort(v.dueDate) }} · {{ when(v) }}
            </span>
          </span>
          <span class="num small">{{ money0(vaultBalance(v)) }}</span>
        </button>
        <Bar
          :pct="(vaultSaved(v) / v.target) * 100"
          :cls="
            vaultSaved(v) >= v.target
              ? ''
              : daysTo(v) < 30 && vaultSaved(v) / v.target < 0.7
                ? 'warn'
                : ''
          "
        />
        <div class="row">
          <span class="muted small">
            {{
              vaultSaved(v) >= v.target
                ? 'Coffre plein'
                : `${money0(vaultNeed(v, key))} / mois${vaultTodo(v, key) < 0.5 ? ' · fait ce mois' : ''}`
            }}
          </span>
          <span style="display: flex; gap: 6px">
            <button v-if="vaultTodo(v, key) >= 0.5" class="minibtn ghost" @click="fillOne(v)">
              Verser {{ money0(vaultTodo(v, key)) }}
            </button>
            <button class="minibtn" @click="ui.open('UseVaultSheet', { id: v.id })">
              Utiliser
            </button>
          </span>
        </div>
      </div>
      <button class="secondary" @click="ui.open('VaultSheet', {})">
        <Icon name="plus" :size="18" />
        Nouveau coffre
      </button>
    </div>
  </template>

  <div class="card">
    <h3>Les 3 prochains mois</h3>
    <div v-for="r in forecast" :key="r.key" class="fc">
      <div class="row">
        <b>{{ monthName(r.key) }}</b>
        <span class="badge" :class="r.heavy ? 'b-question' : 'b-keep'">
          {{ r.heavy ? 'Mois chargé' : 'Mois calme' }}
        </span>
      </div>
      <div class="muted small">
        Déjà engagé : {{ money0(r.total) }} (charges, abonnements {{ money0(r.A) }}, coffres
        {{ money0(r.V) }}, rêve){{
          S.income ? ` · reste ${money0(S.income - r.total)} pour vivre` : ''
        }}
      </div>
      <div v-for="s in r.big" :key="s.id" class="small">
        <Icon name="alert" :size="14" />
        {{ s.name }} annuel : {{ money0(s.price) }}
      </div>
      <div v-for="v in r.dues" :key="v.id" class="small">
        <Icon :name="v.icon" :size="14" />
        {{ v.name }} : {{ money0(v.target) }} · coffre rempli à
        {{ Math.round((vaultSaved(v) / v.target) * 100) }} %
      </div>
    </div>
  </div>

  <div v-if="closed.length" class="card">
    <h3>Coffres terminés</h3>
    <button
      v-for="v in closed"
      :key="v.id"
      class="list-btn"
      @click="ui.open('VaultSheet', { id: v.id })"
    >
      <span class="ico sm" :style="{ '--c': v.color }"><Icon :name="v.icon" :size="16" /></span>
      <span class="mid">
        {{ v.name }}
        <br />
        <span class="muted small">
          {{ money0(vaultUsed(v)) }} utilisés sur {{ money0(vaultSaved(v)) }}
        </span>
      </span>
    </button>
  </div>
</template>
