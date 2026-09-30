<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import Bar from '../components/Bar.vue';
import {
  S,
  COLORS,
  curKey,
  today,
  monthName,
  dayShort,
  money0,
  clamp,
  gState,
  groceryMonth,
  currentWeek,
  listEstimate,
  listStatus,
  starterItems,
  groceryBudget,
  plural
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const ui = useUI();
const router = useRouter();
const key = curKey();
const items = computed(() => gState().items);
const G = computed(() => groceryMonth(key));
const cw = computed(() => currentWeek());
const pct = computed(() => (G.value.budget ? (G.value.spent / G.value.budget) * 100 : 0));
const rows = computed(() => {
  const g = G.value;
  const m = g.mList;
  const out = [
    {
      k: `${key}:M`,
      ic: 'box',
      color: COLORS[4],
      title: 'Grande course du mois',
      sub: 'Stock : épicerie, hygiène, maison',
      env: m ? listEstimate(m) : g.planM,
      spent: m && m.done ? m.ticket : 0,
      L: m,
      cur: false,
      future: !(m && m.done)
    }
  ];
  g.weeks.forEach(w =>
    out.push({
      k: w.key,
      ic: 'cart',
      color: COLORS[0],
      title: `Semaine ${w.n}`,
      sub: `${dayShort(w.from)} – ${dayShort(w.to)}`,
      env: w.env,
      spent: w.spent,
      L: w.list,
      cur: cw.value && cw.value.key === w.key,
      future: w.from > today()
    })
  );
  return out.map(r => ({
    ...r,
    st: listStatus(r.L, r.env),
    p: r.env > 0 ? (r.spent / r.env) * 100 : 0
  }));
});
/** Nombre de semaines de courses fraîches que représente un montant (ex. 1,6). */
const weeksOfFresh = amount => Math.round((amount / G.value.weekAvg) * 10) / 10;

/** Les points qui font déraper le budget courses ce mois-ci. */
const insights = computed(() => {
  const g = G.value;
  const list = [];

  if (g.small.length) {
    let t = `<b>${plural(g.small.length, 'petit passage', 'petits passages')}</b>`;
    t += ` à moins de 15 € hors liste : ${money0(g.smallSum)}.`;
    if (g.weekAvg > 0 && g.smallSum >= g.weekAvg * 0.4) {
      t += ` C’est ${weeksOfFresh(g.smallSum)} semaine${g.smallSum >= g.weekAvg * 1.5 ? 's' : ''} de frais.`;
    }
    list.push({ ic: 'alert', t });
  }

  if (g.offN) {
    const t = `<b>${money0(g.off)} hors liste</b> ajoutés pendant les courses (${plural(g.offN, 'article')}).`;
    list.push({ ic: 'bag', t });
  }

  if (g.doneN) {
    let t;
    if (g.drift > 1)
      t = `Tes tickets dépassent tes listes de <b>${money0(g.drift)}</b> au total ce mois.`;
    else if (g.drift < -1)
      t = `Tes tickets respectent tes listes (${money0(-g.drift)} d’économie).`;
    else t = 'Tes tickets respectent tes listes.';
    list.push({ ic: 'receipt', t });
  }

  if (g.resto > 0 && g.weekAvg > 0) {
    const weeks = weeksOfFresh(g.resto);
    const t = `Restos & cafés : ${money0(g.resto)} ce mois, soit <b>${weeks} semaine${weeks >= 1.5 ? 's' : ''} de courses</b> fraîches.`;
    list.push({ ic: 'utensils', t });
  }

  return list;
});
const nm = computed(() => items.value.filter(i => i.rhythm === 'month').length);
function starter() {
  gState().items = starterItems();
  if (!groceryBudget()) ui.open('GroceryBudgetSheet', {});
  ui.toast('Liste type chargée', 'Ajuste les produits et les prix à ta façon.');
}
const open = k => router.push('/courses/' + encodeURIComponent(k));
</script>

<template>
  <div class="vhead">
    <div>
      <h1>Courses</h1>
      <div class="sub">{{ monthName(key) }}</div>
    </div>
    <button
      v-if="items.length"
      class="icon-btn"
      aria-label="Mes produits"
      @click="ui.open('CatalogSheet', {})"
    >
      <Icon name="list" :size="22" />
    </button>
  </div>

  <div v-if="!items.length" class="card">
    <div class="empty">
      <b><Icon name="cart" :size="34" /></b>
      Sans plan, les courses et les petits passages au magasin font vite exploser le budget.
      <br />
      <br />
      L’appli te propose une
      <strong>grande course au début du mois</strong>
      pour le stock, puis une
      <strong>petite liste par semaine</strong>
      pour le frais, chacune avec son enveloppe.
    </div>
    <button class="primary" data-a="gstarter" @click="starter">
      <Icon name="sparkles" :size="18" />
      Commencer avec une liste type
    </button>
    <button class="secondary" @click="ui.open('ProductSheet', {})">
      Ajouter mes propres produits
    </button>
  </div>

  <template v-else>
    <div v-if="!G.budget" class="card">
      <div class="note" style="margin: 0; padding: 0">
        <Icon name="target" :size="18" />
        <div>
          Fixe un budget courses pour le mois : il sera réparti entre la grande course et chaque
          semaine.
        </div>
      </div>
      <button class="primary" style="margin-top: 12px" @click="ui.open('GroceryBudgetSheet', {})">
        Fixer mon budget courses
      </button>
    </div>
    <div v-else class="card">
      <div class="row">
        <div>
          <div class="muted small">Dépensé en courses ce mois</div>
          <div class="big2 num">
            {{ money0(G.spent) }}
            <span class="muted">/ {{ money0(G.budget) }}</span>
          </div>
        </div>
        <button class="minibtn ghost" @click="ui.open('GroceryBudgetSheet', {})">Modifier</button>
      </div>
      <Bar :pct="pct" />
      <div class="muted small">
        Grande course {{ money0(G.planM) }} · frais ≈ {{ money0(G.weekAvg) }} par semaine
      </div>
    </div>

    <div class="card">
      <h3>Tes listes</h3>
      <button v-for="r in rows" :key="r.k" class="glist" :class="{ cur: r.cur }" @click="open(r.k)">
        <span class="ico" :style="{ '--c': r.color }"><Icon :name="r.ic" /></span>
        <span class="mid">
          <span class="row">
            <b>{{ r.title }}</b>
            <span class="badge" :class="'b-' + r.st.k">{{ r.st.t }}</span>
          </span>
          <span class="muted small">{{ r.sub }}{{ r.cur ? ' · cette semaine' : '' }}</span>
          <template v-if="G.budget">
            <Bar thin :pct="r.future ? 0 : r.p" :warn-at="90" :over-at="102" />
            <span class="small num">
              {{
                r.future ? `Enveloppe ${money0(r.env)}` : `${money0(r.spent)} sur ${money0(r.env)}`
              }}
            </span>
          </template>
        </span>
      </button>
    </div>

    <div class="card">
      <h3>Ce qui fait déraper</h3>
      <div v-for="x in insights" :key="x.t" class="ins">
        <Icon :name="x.ic" :size="18" />
        <div v-html="x.t" />
      </div>
      <div v-if="!insights.length" class="muted small">
        Rien à signaler pour l’instant. Continue avec tes listes.
      </div>
    </div>

    <div class="card">
      <button class="row" style="width: 100%" @click="ui.open('CatalogSheet', {})">
        <span>
          <b>Mes produits</b>
          <br />
          <span class="muted small">
            {{ nm }} pour la grande course · {{ items.length - nm }} chaque semaine
          </span>
        </span>
        <span class="muted"><Icon name="right" :size="18" /></span>
      </button>
    </div>
  </template>
</template>
