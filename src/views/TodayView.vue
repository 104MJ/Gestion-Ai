<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import Bar from '../components/Bar.vue';
import TxRow from '../components/TxRow.vue';
import {
  S,
  sum,
  clamp,
  today,
  addDays,
  pd,
  dayLong,
  dayShort,
  money,
  money0,
  cats,
  activeSubs,
  occurrences,
  nextDebit,
  verdictOf,
  FREQ,
  todayInfo,
  streak,
  activeGoal,
  savedOf,
  revealOf,
  penalty,
  etaText,
  impact,
  curKey,
  mod,
  gState,
  groceryBudget,
  groceryMonth,
  currentWeek,
  openVaults,
  vaultTodo,
  vaultBalance,
  vaultSaved,
  openDebts,
  debtLeft,
  checkDue,
  daysSinceCheck,
  plural
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';
import { deposit, pushPing } from '../actions.js';

const ui = useUI();
const router = useRouter();
const now = new Date();
const g = computed(() => activeGoal());
const T = computed(() => todayInfo());
const st = computed(() => streak());
const over = computed(() => T.value.leftToday < 0);
const exhausted = computed(() => T.value.remainingMonth <= 0.5 && !over.value);

const todays = computed(() =>
  S.transactions
    .filter(t => t.date === today() && t.type === 'expense')
    .sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0))
);
const quick = computed(() => {
  const from = addDays(today(), -60),
    cnt = {};
  S.transactions
    .filter(t => t.type === 'expense' && t.date >= from)
    .forEach(t => {
      cnt[t.categoryId] = (cnt[t.categoryId] || 0) + 1;
    });
  return cats('expense')
    .slice()
    .sort((x, y) => (cnt[y.id] || 0) - (cnt[x.id] || 0))
    .slice(0, 5);
});
const noSpendToday = computed(() => (S.noSpend || {})[today()]);
function noSpend() {
  S.noSpend = { ...(S.noSpend || {}), [today()]: true };
  pushPing({ logged: today() });
  ui.toast('Journée sans dépense notée', 'Pas de rappel ce soir.');
}

const week = computed(() => {
  if (!mod('courses') || !gState().items.length || !(groceryBudget() > 0)) return null;
  const G = groceryMonth(curKey());
  const cw = currentWeek();
  const w = G.weeks[cw.n - 1];
  return { cw, w, L: w.list, G, p: w.env > 0 ? (w.spent / w.env) * 100 : 0 };
});

const goal = computed(() => {
  if (!g.value) return null;
  const r = revealOf(g.value),
    pen = penalty();
  return {
    r,
    s: savedOf(g.value),
    pen,
    eta: etaText(g.value),
    planDone: g.value.deposits.some(x => x.kind === 'plan' && x.date.startsWith(curKey()))
  };
});
const R = 15.9155;

const vaults = computed(() => {
  if (!mod('vaults') || !openVaults().length) return null;
  const vs = openVaults();
  const next = vs.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return { todo: sum(vs, v => vaultTodo(v)), bal: sum(vs, vaultBalance), next };
});
function fillVaults() {
  let t = 0;
  openVaults().forEach(v => {
    const td = vaultTodo(v);
    if (td > 0) {
      t += td;
      v.deposits.push({
        id: Math.random().toString(36).slice(2),
        date: today(),
        amount: Math.round(td * 100) / 100
      });
    }
  });
  ui.toast(
    `${money0(t)} rangés dans tes coffres`,
    'Pense à faire le virement vers ton compte épargne.'
  );
}
const debts = computed(() => {
  if (!mod('debts')) return null;
  const od = openDebts();
  const late = od.filter(d => (pd(today()) - pd(d.date)) / 864e5 > 30).length;
  let text = 'Personne ne te doit rien pour l’instant.';
  if (od.length) {
    text = `${plural(od.length, 'somme')} en attente`;
    if (late) text += ` · ${late} depuis plus de 30 jours`;
  }
  return { od, tot: sum(od, debtLeft), late, text };
});

const alerts = computed(() => {
  const out = [];
  const t = today(),
    in7 = addDays(t, 7),
    tm = addDays(t, 1);
  activeSubs().forEach(s => {
    const trial = s.trialEnd && !s.trialKeep && s.trialEnd >= t && s.trialEnd <= in7;
    if (trial) {
      const n = Math.round((pd(s.trialEnd) - pd(t)) / 864e5);
      out.push({
        ic: 'hourglass',
        t: `Fin d’essai ${s.name} ${n === 0 ? 'aujourd’hui' : n === 1 ? 'demain' : `dans ${n} jours`}`,
        s: `Ensuite ${money(s.price)} / ${FREQ[s.freq]}. Tu le gardes ?`,
        id: s.id
      });
    }
    const nd = nextDebit(s);
    if (nd && (nd === t || nd === tm) && !trial)
      out.push({
        ic: 'repeat',
        t: `${s.name} : ${money(s.price)} ${nd === t ? 'prélevé aujourd’hui' : 'prélevé demain'}`,
        s: verdictOf(s).k === 'suggest' ? 'Peu utilisé ces derniers temps.' : '',
        id: s.id
      });
  });
  return out;
});

const waiting = computed(() =>
  mod('envies')
    ? S.envies.filter(e => e.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt)
    : []
);
/** Temps de réflexion restant pour une envie (règle des 72 h). */
function envieInfo(e) {
  const msLeft = e.createdAt + 72 * 3600e3 - Date.now();
  if (msLeft <= 0) return { ready: true, txt: 'Les 72 h sont passées. Alors, toujours envie ?' };
  const hours = Math.ceil(msLeft / 3600e3);
  const wait = hours >= 24 ? `${Math.floor(hours / 24)} j ${hours % 24} h` : `${hours} h`;
  return { ready: false, txt: `Encore ${wait} de réflexion · ${impact(e.amount)}` };
}
function renounce(e) {
  e.status = 'renounced';
  e.decidedAt = Date.now();
  if (activeGoal()) deposit(e.amount, `Envie abandonnée : ${e.name}`, 'envie');
  else ui.toast(`${money0(e.amount)} sauvés`);
}
function buy(e) {
  ui.open('TxSheet', {
    preset: {
      type: 'expense',
      amount: String(e.amount).replace('.', ','),
      note: e.name,
      categoryId: 'c-shop',
      fromEnvie: e.id
    }
  });
}

const upcoming = computed(() => {
  const t = today(),
    up = [];
  activeSubs().forEach(s => occurrences(s, t, addDays(t, 14)).forEach(d => up.push({ s, d })));
  return up.sort((a, b) => a.d.localeCompare(b.d));
});
const monthP = computed(() => (T.value.M.B > 0 ? (T.value.M.spentTracked / T.value.M.B) * 100 : 0));
</script>

<template>
  <div class="today-top">
    <div>
      <div class="hello">Bonjour{{ S.name ? ', ' + S.name : '' }}</div>
      <div class="date">
        {{ now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) }}
      </div>
    </div>
    <button class="icon-btn" aria-label="Réglages" @click="router.push('/reglages')">
      <Icon name="sliders" />
    </button>
  </div>

  <div class="hero">
    <div v-if="g" class="dream">En route vers « {{ g.name }} »</div>
    <template v-if="T.M.B <= 0">
      <div class="amount over">{{ money0(T.M.B) }}</div>
      <div class="caption">Ton mois est dans le rouge avant même de commencer.</div>
      <div class="tomorrow">
        Revois tes charges, tes abonnements ou ton épargne dans les réglages.
      </div>
    </template>
    <template v-else-if="exhausted">
      <div class="amount over">0 €</div>
      <div class="caption">Le budget du quotidien est épuisé pour ce mois.</div>
      <div class="tomorrow">
        {{ T.remainingMonth < -0.5 ? `Dépassement : ${money0(-T.remainingMonth)} · ` : '' }}Nouveau
        départ le 1er.
      </div>
    </template>
    <template v-else>
      <div class="amount" :class="{ over }">{{ money0(Math.abs(T.leftToday)) }}</div>
      <div class="caption">
        {{ over ? 'de dépassement aujourd’hui' : 'à dépenser aujourd’hui' }}
      </div>
      <div v-if="T.tomorrow != null" class="tomorrow">
        Demain : {{ money0(T.tomorrow) }} · {{ T.daysLeft - 1 }} jour{{
          T.daysLeft - 1 > 1 ? 's' : ''
        }}
        avant la fin du mois
      </div>
    </template>
    <div class="pill">
      <Icon name="flame" :size="15" />
      {{ st > 0 ? `${plural(st, 'jour')} de suite dans ta limite` : 'Nouvelle série à démarrer' }}
    </div>
  </div>

  <!-- dépenses du jour -->
  <div class="glass">
    <div class="row">
      <h3 style="margin: 0">Dépenses du jour</h3>
      <span class="num">
        {{ todays.length ? '−' + money(sum(todays, t => t.amount)) : 'Rien pour l’instant' }}
      </span>
    </div>
    <div class="quick">
      <button
        v-for="c in quick"
        :key="c.id"
        class="qc"
        data-a="quick"
        @click="ui.open('TxSheet', { preset: { type: 'expense', categoryId: c.id } })"
      >
        <span class="ico" :style="{ '--c': c.color }"><Icon :name="c.icon" :size="19" /></span>
        <span>{{ c.name.split(/ & | /)[0] }}</span>
      </button>
    </div>
    <TxRow v-for="t in todays.slice(0, 4)" :key="t.id" :t="t" />
    <template v-if="!todays.length">
      <div v-if="noSpendToday" class="muted small" style="margin: 6px 0">
        <Icon name="check" :size="14" style="display: inline-block; vertical-align: -2px" />
        Journée sans dépense notée.
      </div>
      <button v-else class="addline" data-a="nospend" @click="noSpend">
        <Icon name="check" :size="16" />
        Je n’ai rien dépensé aujourd’hui
      </button>
    </template>
    <button class="addline" @click="router.push('/depenses')">
      <Icon name="list" :size="16" />
      Toutes mes dépenses du mois
    </button>
  </div>

  <!-- point hebdo -->
  <div v-if="mod('check') && checkDue()" class="glass">
    <div class="alert" style="padding: 0">
      <span class="ico"><Icon name="checkCircle" :size="18" /></span>
      <div class="mid">
        <b>
          {{
            daysSinceCheck() == null ? 'Relie l’appli à la réalité' : 'C’est l’heure du point hebdo'
          }}
        </b>
        <span class="muted small">
          {{
            daysSinceCheck() == null
              ? 'Donne une fois le solde de ton compte : chaque semaine, on vérifiera qu’aucune dépense n’a été oubliée.'
              : `Dernier point il y a ${daysSinceCheck()} jours. 30 secondes avec ton appli bancaire.`
          }}
        </span>
      </div>
      <button class="minibtn" data-a="check" @click="ui.open('CheckSheet', {})">
        {{ daysSinceCheck() == null ? 'Commencer' : 'Faire le point' }}
      </button>
    </div>
  </div>

  <!-- courses -->
  <div v-if="week" class="glass">
    <div class="row">
      <h3 style="margin: 0">Courses · semaine {{ week.cw.n }}</h3>
      <span class="num">{{ money0(week.w.spent) }} / {{ money0(week.w.env) }}</span>
    </div>
    <Bar :pct="week.p" />
    <div class="row">
      <span class="muted small">
        {{
          week.L
            ? week.L.done
              ? 'Liste faite'
              : `${week.L.items.length} articles sur ta liste`
            : 'Liste pas encore préparée'
        }}{{ week.G.small.length ? ` · ${week.G.small.length} petits passages ce mois` : '' }}
      </span>
      <button class="minibtn" @click="router.push('/courses/' + encodeURIComponent(week.cw.key))">
        Ma liste
      </button>
    </div>
  </div>

  <!-- rêve -->
  <div v-if="goal" class="glass">
    <div class="goal-row">
      <div class="ring">
        <svg viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            :r="R"
            fill="none"
            stroke="rgba(255,255,255,.2)"
            stroke-width="3.2"
          />
          <circle
            v-if="goal.r > 0"
            cx="18"
            cy="18"
            :r="R"
            fill="none"
            stroke="#fff"
            stroke-width="3.2"
            stroke-linecap="round"
            :stroke-dasharray="`${goal.r * 100} ${100 - goal.r * 100}`"
          />
        </svg>
        <b>{{ Math.round(goal.r * 100) }}%</b>
      </div>
      <div style="flex: 1; min-width: 0">
        <div class="name">{{ g.name }}</div>
        <div class="muted small">
          {{ money0(goal.s) }} sur {{ money0(g.target) }} · photo révélée à
          {{ Math.round(goal.r * 100) }} %
        </div>
        <div v-if="goal.eta" class="muted small">
          {{ goal.r >= 1 ? 'Rêve atteint' : 'À ce rythme : ' + goal.eta }}
        </div>
      </div>
    </div>
    <div v-if="goal.r >= 1" class="note line">
      <Icon name="sparkles" :size="18" />
      <div>
        <b>Rêve atteint.</b>
        La photo est entièrement révélée. Tu peux lancer un nouveau rêve dans les réglages.
      </div>
    </div>
    <div v-else-if="goal.pen.over > 0" class="note line">
      <Icon name="alert" :size="18" />
      <div>
        La photo se brouille : tu dépasses ton rythme du mois de
        <b>{{ money0(goal.pen.over) }}</b>
        .
      </div>
    </div>
    <div class="gbtns">
      <button class="gbtn" data-a="deposit" @click="ui.open('DepositSheet', {})">
        <Icon name="piggy" :size="17" />
        Mettre de côté
      </button>
      <button
        v-if="S.savingsPlan > 0 && !goal.planDone && goal.r < 1"
        class="gbtn ghost"
        @click="deposit(S.savingsPlan, 'Épargne du mois', 'plan')"
      >
        Verser mes {{ money0(S.savingsPlan) }}
      </button>
    </div>
  </div>
  <div v-else class="glass">
    <div class="note" style="margin: 0; padding: 0">
      <Icon name="target" :size="18" />
      <div>
        Tu n’as pas encore de rêve.
        <button class="link" style="color: #fff" @click="ui.open('GoalSheet', {})">
          Créer mon rêve →
        </button>
      </div>
    </div>
  </div>

  <!-- coffres -->
  <div v-if="vaults" class="glass">
    <div class="row">
      <h3 style="margin: 0">Coffres</h3>
      <span class="num">{{ money0(vaults.bal) }} de côté</span>
    </div>
    <div class="muted small" style="margin: 6px 0 10px">
      Prochain : {{ vaults.next.name }}, le {{ dayShort(vaults.next.dueDate) }} · rempli à
      {{ Math.round((vaultSaved(vaults.next) / vaults.next.target) * 100) }} %
    </div>
    <div class="gbtns" style="margin: 0">
      <button v-if="vaults.todo > 0.5" class="gbtn" @click="fillVaults">
        Remplir · {{ money0(vaults.todo) }}
      </button>
      <button class="gbtn ghost" @click="router.push('/coffres')">Voir mes coffres</button>
    </div>
  </div>

  <!-- on me doit -->
  <div v-if="debts" class="glass">
    <div class="row">
      <h3 style="margin: 0">On me doit</h3>
      <span class="num">{{ debts.od.length ? money0(debts.tot) : '—' }}</span>
    </div>
    <div class="muted small" style="margin: 6px 0 10px">
      {{ debts.text }}
    </div>
    <div class="gbtns" style="margin: 0">
      <button class="gbtn ghost" data-a="debts" @click="ui.open('DebtsSheet', {})">
        {{ debts.od.length ? 'Voir le détail' : 'Noter une somme due' }}
      </button>
    </div>
  </div>

  <!-- alertes -->
  <div v-if="alerts.length" class="glass">
    <h3>À surveiller</h3>
    <div v-for="a in alerts" :key="a.t" class="alert">
      <span class="ico"><Icon :name="a.ic" :size="18" /></span>
      <div class="mid">
        <b>{{ a.t }}</b>
        <span v-if="a.s" class="muted small">{{ a.s }}</span>
      </div>
      <button class="minibtn ghost" @click="ui.open('SubSheet', { id: a.id })">Voir</button>
    </div>
  </div>

  <!-- envies -->
  <div v-if="mod('envies')" class="glass">
    <h3>Envies · règle des 72 h</h3>
    <div v-if="!waiting.length" class="muted small">
      Une envie d’acheter ? Note-la ici au lieu de payer tout de suite. On en reparle dans 72 h.
    </div>
    <div v-for="e in waiting" :key="e.id" class="envie">
      <div class="top">
        <span>{{ e.name }}</span>
        <span class="num">{{ money0(e.amount) }}</span>
      </div>
      <div class="wait muted">
        <Icon :name="envieInfo(e).ready ? 'sparkles' : 'hourglass'" :size="14" />
        {{ envieInfo(e).txt }}
      </div>
      <div class="acts">
        <button class="minibtn" data-a="renounce" @click="renounce(e)">J’y renonce</button>
        <button class="minibtn ghost" @click="buy(e)">
          {{ envieInfo(e).ready ? 'Je l’achète' : 'Craquer maintenant' }}
        </button>
      </div>
    </div>
    <button class="addline" @click="ui.open('TxSheet', { preset: { type: 'envie' } })">
      <Icon name="plus" :size="16" />
      Noter une envie
    </button>
  </div>

  <!-- ce mois -->
  <div v-if="T.M.B > 0" class="glass">
    <h3>Ce mois-ci</h3>
    <div class="row">
      <span>
        {{ money0(Math.max(0, T.remainingMonth)) }} restants pour {{ T.daysLeft }} jour{{
          T.daysLeft > 1 ? 's' : ''
        }}
      </span>
      <span class="muted small">{{ Math.round(monthP) }} %</span>
    </div>
    <Bar :pct="monthP" />
    <div class="muted small">
      Budget du quotidien : {{ money0(T.M.B) }} = revenus {{ money0(T.M.M) }} − charges
      {{ money0(T.M.F) }} − abonnements {{ money0(T.M.A) }} − rêve {{ money0(T.M.E)
      }}{{ T.M.V ? ` − coffres ${money0(T.M.V)}` : ''
      }}{{ T.M.sm > 1 ? ` · premier mois compté à partir du ${T.M.sm}` : '' }}
    </div>
  </div>

  <!-- prélèvements -->
  <div v-if="upcoming.length" class="glass">
    <h3>Prélèvements des 14 prochains jours</h3>
    <div v-for="x in upcoming.slice(0, 4)" :key="x.s.id + x.d" class="alert">
      <span class="ico"><Icon :name="x.s.icon" :size="18" /></span>
      <div class="mid">
        <b>{{ x.s.name }}</b>
        <span class="muted small">{{ dayLong(x.d) }}</span>
      </div>
      <span class="num">{{ money(x.s.price) }}</span>
    </div>
    <button v-if="upcoming.length > 4" class="addline" @click="router.push('/abonnements')">
      Voir les {{ upcoming.length }} prélèvements
    </button>
  </div>
  <div style="height: 10px" />
</template>
