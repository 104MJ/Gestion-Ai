<script setup>
import { ref, computed } from 'vue';
import Icon from '../components/Icon.vue';
import {
  S,
  sum,
  today,
  addDays,
  pd,
  dayShort,
  dayLong,
  money,
  money0,
  FREQ,
  activeSubs,
  monthlyEq,
  paidSoFar,
  occurrences,
  nextDebit,
  verdictOf,
  usesSince,
  activeGoal,
  savedOf,
  monthlySaving,
  etaDay,
  etaText,
  durText,
  impact
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const ui = useUI();
const act = computed(() => activeSubs());
const perMonth = computed(() => sum(act.value, monthlyEq));
const g = computed(() => activeGoal());
const t = today();
const up = computed(() => {
  const u = [];
  act.value.forEach(s => occurrences(s, t, addDays(t, 30)).forEach(d => u.push({ s, d })));
  return u.sort((a, b) => a.d.localeCompare(b.d));
});
const trials = computed(() =>
  act.value
    .filter(s => s.trialEnd && s.trialEnd >= t && !s.trialKeep)
    .sort((a, b) => a.trialEnd.localeCompare(b.trialEnd))
    .map(s => {
      const lim = addDays(s.trialEnd, -1);
      return { s, lim, n: Math.round((pd(lim) - pd(t)) / 864e5) };
    })
);
const sel = ref(new Set());
function toggleSim(id) {
  const n = new Set(sel.value);
  n.has(id) ? n.delete(id) : n.add(id);
  sel.value = n;
}
const simSubs = computed(() => act.value.filter(s => sel.value.has(s.id)));
/** Ce que rapporterait la résiliation des abonnements sélectionnés. */
const sim = computed(() => {
  if (!simSubs.value.length) return null;
  const perMonth = sum(simSubs.value, monthlyEq);
  const G = g.value;
  let line = '';
  if (G && savedOf(G) < G.target) {
    const remaining = G.target - savedOf(G);
    const rate = monthlySaving();
    if (rate > 0) {
      const daysGained = (remaining / rate - remaining / (rate + perMonth)) * 30.44;
      const newDate = dayShort(etaDay(G, perMonth));
      const oldDate = dayShort(etaDay(G));
      line = `« ${G.name} » atteint <b>${durText(daysGained)} plus tôt</b>`;
      line += ` (le ${newDate} au lieu du ${oldDate}) si tu verses cet argent à ton rêve.`;
    } else {
      line = `En versant cet argent à « ${G.name} », tu l’atteins en ${durText((remaining / perMonth) * 30.44)}.`;
    }
  }
  return { m: perMonth, line };
});

async function applySim() {
  const list = simSubs.value;
  if (
    !list.length ||
    !(await ui.ask(
      `Marquer ${list.map(s => s.name).join(', ')} comme résilié${list.length > 1 ? 's' : ''} aujourd’hui ?`
    ))
  )
    return;
  list.forEach(s => {
    s.cancelledAt = today();
  });
  const m = sum(list, monthlyEq);
  sel.value = new Set();
  ui.toast(
    `+${money0(m * 12)} par an récupérés`,
    'Pense à augmenter ton épargne pour ton rêve dans les réglages.'
  );
}
const order = { cancel: 0, suggest: 1, question: 2, none: 3, keep: 4 };
const sorted = computed(() =>
  act.value
    .slice()
    .sort((a, b) => order[verdictOf(a).k] - order[verdictOf(b).k] || monthlyEq(b) - monthlyEq(a))
);
const canc = computed(() => S.subs.filter(s => s.cancelledAt));
const savedC = computed(() =>
  sum(
    canc.value,
    s => occurrences({ ...s, cancelledAt: null }, s.cancelledAt, today()).length * s.price
  )
);
const showC = ref(false);
function used(s) {
  s.uses.push(today());
  s.uses.sort();
  ui.toast(
    `Utilisation notée · ${s.uses.length} au total`,
    `${money(paidSoFar(s) / s.uses.length)} par utilisation`
  );
}
function trialCancel(s) {
  s.cancelledAt = today();
  ui.toast(`${s.name} résilié à temps`, `${money0(monthlyEq(s) * 12)} par an évités`);
}
function trialKeep(s) {
  s.trialKeep = true;
  s.verdict = s.verdict || 'keep';
  ui.toast(`${s.name} gardé`, `Premier prélèvement le ${dayShort(s.trialEnd)}`);
}
const cpu = s => (s.uses.length && paidSoFar(s) > 0 ? money(paidSoFar(s) / s.uses.length) : '—');
</script>

<template>
  <div class="vhead">
    <div>
      <h1>Abonnements</h1>
      <div class="sub">{{ act.length }} actif{{ act.length > 1 ? 's' : '' }}</div>
    </div>
  </div>
  <div v-if="!S.subs.length" class="card">
    <div class="empty">
      <b><Icon name="repeat" :size="32" /></b>
      Ajoute chaque abonnement séparément (Netflix, Spotify, salle de sport…).
      <br />
      L’appli calcule ce qu’il te coûte vraiment.
    </div>
    <button class="primary" @click="ui.open('SubSheet', {})">
      <Icon name="plus" :size="18" />
      Ajouter un abonnement
    </button>
  </div>
  <template v-else>
    <div class="card">
      <div class="subhero">
        <div>
          <div class="muted small">Par mois</div>
          <div class="big">{{ money0(perMonth) }}</div>
        </div>
        <div>
          <div class="muted small">Par an</div>
          <div style="font-size: 20px; font-weight: 650" class="num">
            {{ money0(perMonth * 12) }}
          </div>
        </div>
      </div>
      <p class="muted small" style="margin: 10px 0 0">
        Tu as déjà payé
        <b style="color: var(--text)">{{ money0(sum(S.subs, paidSoFar)) }}</b>
        en abonnements depuis que tu les as ajoutés
        <template v-if="g">
          · {{ money0(perMonth * 12) }} par an {{ impact(perMonth * 12) }}
        </template>
        .
      </p>
    </div>

    <div class="card">
      <div class="row" :style="{ marginBottom: trials.length ? '10px' : '0' }">
        <h3 style="margin: 0">Essais gratuits</h3>
        <button
          class="minibtn ghost"
          data-a="addtrial"
          @click="ui.open('SubSheet', { trial: true })"
        >
          <Icon name="plus" :size="14" />
          Essai
        </button>
      </div>
      <p v-if="!trials.length" class="muted small" style="margin: 8px 0 0">
        Tu t’inscris à un essai gratuit ? Note-le ici : l’appli te rappelle la date limite pour
        résilier avant le premier prélèvement.
      </p>
      <div v-for="x in trials" :key="x.s.id" class="trial" :class="{ urgent: x.n <= 2 }">
        <button class="head" @click="ui.open('SubSheet', { id: x.s.id })">
          <span class="ico sm" :style="{ '--c': x.s.color }">
            <Icon :name="x.s.icon" :size="16" />
          </span>
          <span class="mid">
            <b>{{ x.s.name }}</b>
            <br />
            <span class="small" :class="x.n <= 2 ? 'neg' : 'muted'">
              Résilie avant le {{ dayShort(x.lim)
              }}{{ x.n <= 0 ? ' · aujourd’hui' : x.n === 1 ? ' · demain' : ` · dans ${x.n} j` }}
            </span>
          </span>
          <span class="small muted num">puis {{ money(x.s.price) }}/{{ FREQ[x.s.freq] }}</span>
        </button>
        <div class="acts">
          <button class="minibtn" @click="trialCancel(x.s)">Je l’ai résilié</button>
          <button class="minibtn ghost" @click="trialKeep(x.s)">Je le garde</button>
        </div>
      </div>
    </div>

    <div v-if="up.length" class="card">
      <h3>30 prochains jours · {{ money0(sum(up, x => x.s.price)) }}</h3>
      <div class="timeline">
        <button
          v-for="x in up"
          :key="x.s.id + x.d"
          class="tl"
          :class="{ soon: x.d <= addDays(t, 2) }"
          style="text-align: left"
          @click="ui.open('SubSheet', { id: x.s.id })"
        >
          <div class="d">
            {{ x.d === t ? 'Aujourd’hui' : x.d === addDays(t, 1) ? 'Demain' : dayShort(x.d) }}
          </div>
          <span class="ico sm" :style="{ '--c': x.s.color, marginTop: '8px' }">
            <Icon :name="x.s.icon" :size="16" />
          </span>
          <div class="n">{{ x.s.name }}</div>
          <div class="p num">{{ money(x.s.price) }}</div>
        </button>
      </div>
    </div>

    <div class="card">
      <h3>Et si je résiliais…</h3>
      <div class="simchips">
        <button
          v-for="s in act"
          :key="s.id"
          class="chip"
          :class="{ on: sel.has(s.id) }"
          :style="{ '--c': s.color }"
          @click="toggleSim(s.id)"
        >
          <Icon :name="s.icon" :size="16" />
          {{ s.name }}
        </button>
      </div>
      <template v-if="sim">
        <div class="simres">
          <b class="num simbig">+{{ money0(sim.m * 12) }}</b>
          <span class="muted">par an ({{ money0(sim.m) }}/mois)</span>
          <div class="small" style="margin-top: 6px" v-html="sim.line" />
        </div>
        <button class="secondary" @click="applySim">
          Marquer {{ simSubs.length > 1 ? 'ces abonnements' : 'cet abonnement' }} comme résilié{{
            simSubs.length > 1 ? 's' : ''
          }}
        </button>
      </template>
      <div v-else class="muted small">
        Touche un ou plusieurs abonnements pour voir ce que tu récupérerais.
      </div>
    </div>

    <div class="card">
      <h3>Mes abonnements</h3>
      <div v-for="s in sorted" :key="s.id" class="subcard">
        <button class="head" @click="ui.open('SubSheet', { id: s.id })">
          <span class="ico" :style="{ '--c': s.color }"><Icon :name="s.icon" /></span>
          <span class="mid">
            <span class="name">{{ s.name }}</span>
            <br />
            <span class="meta">
              {{ money(s.price) }} / {{ FREQ[s.freq]
              }}{{ nextDebit(s) ? ` · prochain le ${dayShort(nextDebit(s))}` : '' }}
            </span>
          </span>
          <span class="badge" :class="'b-' + verdictOf(s).k">{{ verdictOf(s).t }}</span>
        </button>
        <div class="facts">
          <div class="fact">
            <div class="k">Payé au total</div>
            <div class="v">{{ money0(paidSoFar(s)) }}</div>
          </div>
          <div class="fact">
            <div class="k">Utilisations</div>
            <div class="v">
              {{ s.uses.length }}
              <span v-if="usesSince(s, 30)" class="muted small">
                ({{ usesSince(s, 30) }} ce mois)
              </span>
            </div>
          </div>
          <div class="fact">
            <div class="k">Coût / utilisation</div>
            <div class="v">{{ cpu(s) }}</div>
          </div>
        </div>
        <div class="row">
          <span class="muted small">
            {{
              s.uses.length
                ? `Dernière utilisation : ${dayLong(s.uses[s.uses.length - 1]).toLowerCase()}`
                : 'Aucune utilisation notée'
            }}
          </span>
          <button class="minibtn usedbtn" @click="used(s)">
            <Icon name="check" :size="14" />
            Utilisé
          </button>
        </div>
      </div>
    </div>

    <div v-if="canc.length" class="card">
      <button class="row" style="width: 100%" @click="showC = !showC">
        <h3 style="margin: 0">Résiliés · {{ canc.length }}</h3>
        <span class="small pos">{{ money0(savedC) }} économisés</span>
      </button>
      <div v-if="showC" style="margin-top: 12px">
        <div v-for="s in canc" :key="s.id" class="subcard">
          <button class="head" @click="ui.open('SubSheet', { id: s.id })">
            <span class="ico" :style="{ '--c': s.color }"><Icon :name="s.icon" /></span>
            <span class="mid">
              <span class="name">{{ s.name }}</span>
              <br />
              <span class="meta">
                {{ money(s.price) }} / {{ FREQ[s.freq] }} · résilié le {{ dayShort(s.cancelledAt) }}
              </span>
            </span>
            <span class="badge b-cancelled">Résilié</span>
          </button>
        </div>
      </div>
    </div>
  </template>
</template>
