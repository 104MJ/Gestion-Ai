<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import Seg from '../components/Seg.vue';
import { APP_NAME } from '../config.js';
import {
  S,
  CURRENCIES,
  sum,
  money,
  money0,
  amtStr,
  parseAmount,
  curSym,
  cats,
  savedOf,
  activeGoal,
  goalPhoto,
  MODULES,
  mod,
  baseState,
  demoState,
  normalize,
  cap
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';
import { useData } from '../stores/data.js';
import { exportCSV, backup, pushCfg, pushPost, pushPrefs, pushPing } from '../actions.js';
import { pickFile } from '../utils/files.js';

const ui = useUI();
const data = useData();
const router = useRouter();
const g = computed(() => activeGoal());
function setNum(field, e) {
  const v = e.target.value.trim() ? parseAmount(e.target.value) : 0;
  if (!(v >= 0)) return ui.toast('Montant invalide');
  S[field] = v;
  ui.toast('Enregistré');
}
function toggleModule(k) {
  S.modules = { ...S.modules, [k]: !mod(k) };
}
async function loadDemo() {
  if (await ui.ask('Remplacer tes données par des données de démo ?')) {
    await data.replaceAll(demoState());
    router.push('/');
    ui.toast('Démo chargée', 'Explore librement, tu pourras tout effacer ensuite.');
  }
}
async function reset() {
  if (await ui.ask('Tout effacer, photos comprises ? Cette action est définitive.')) {
    await data.replaceAll(baseState());
    router.push('/');
  }
}
async function restore() {
  const f = await pickFile('application/json,.json');
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!d || d.app !== 'cap' || !d.data) throw new Error('format');
    if (!(await ui.ask('Remplacer toutes les données actuelles par cette sauvegarde ?'))) return;
    await data.replaceAll(d.data, d.photos || {});
    ui.toast('Sauvegarde restaurée');
  } catch (e) {
    ui.toast('Fichier de sauvegarde invalide');
  }
}
/* rappels */
const P = computed(() => pushCfg());
const standalone =
  typeof window !== 'undefined' &&
  ((window.matchMedia && matchMedia('(display-mode: standalone)').matches) ||
    navigator.standalone === true);
const supported =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;
const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const u8 = s => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
};
async function enablePush() {
  const p = P.value;
  if (!supported)
    return ui.toast(
      'Ce navigateur ne gère pas les notifications',
      'Sur iPhone : iOS 16.4 minimum, appli ajoutée à l’écran d’accueil.'
    );
  if (!standalone)
    return ui.toast(
      `Installe d’abord ${APP_NAME} sur ton écran d’accueil`,
      'Safari → Partager → Sur l’écran d’accueil, puis ouvre l’appli depuis l’icône.'
    );
  if (!p.server || !p.vapid)
    return ui.toast(
      'Renseigne l’adresse du serveur et la clé publique',
      'Voir le guide « Rappels » dans le dossier push-server.'
    );
  const perm = await Notification.requestPermission();
  if (perm !== 'granted')
    return ui.toast(
      'Notifications refusées',
      'Tu peux les réactiver dans Réglages iPhone → Notifications.'
    );
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: u8(p.vapid)
    });
    p.id =
      p.id ||
      (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2))
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 24);
    const r = await fetch(p.server.replace(/\/$/, '') + '/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: p.id,
        subscription: sub.toJSON(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        daily: p.daily,
        weekly: p.weekly
      })
    });
    if (!r.ok) throw new Error('server');
    p.on = true;
    ui.toast('Rappels activés', 'Touche « Tester » pour recevoir une notification.');
    const today = new Date().toISOString().slice(0, 10);
    pushPing({
      logged: S.transactions.some(t => t.date === today) ? today : undefined,
      checked: S.anchor ? S.anchor.date : undefined
    });
  } catch (e) {
    ui.toast('Activation impossible', 'Vérifie l’adresse du serveur et la clé publique.');
  }
}
async function disablePush() {
  await pushPost('/unsubscribe', {});
  P.value.on = false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const s = await reg.pushManager.getSubscription();
    s && s.unsubscribe();
  } catch (e) {}
  ui.toast('Rappels désactivés');
}
async function testPush() {
  const r = await pushPost('/test', {});
  ui.toast(
    r && r.ok ? 'Notification envoyée' : 'Échec de l’envoi',
    r && r.ok ? 'Elle arrive dans quelques secondes.' : 'Vérifie le serveur de rappels.'
  );
}
function prefs() {
  if (P.value.on) pushPrefs();
}
</script>

<template>
  <div class="vhead">
    <button class="icon-btn" aria-label="Retour" @click="router.push('/')">
      <Icon name="left" :size="24" />
    </button>
    <h1 style="flex: 1">Réglages</h1>
  </div>
  <div class="card">
    <h3>Toi</h3>
    <label class="field">
      <span>Prénom</span>
      <input id="sName" v-model.lazy.trim="S.name" placeholder="Ton prénom" />
    </label>
    <div class="two">
      <label class="field">
        <span>Revenus / mois ({{ curSym() }})</span>
        <input
          id="sIncome"
          inputmode="decimal"
          :value="amtStr(S.income)"
          placeholder="0"
          @change="setNum('income', $event)"
        />
      </label>
      <label class="field">
        <span>Pour ton rêve / mois</span>
        <input
          id="sPlan"
          inputmode="decimal"
          :value="amtStr(S.savingsPlan)"
          placeholder="0"
          @change="setNum('savingsPlan', $event)"
        />
      </label>
    </div>
    <label class="field" style="margin: 0">
      <span>Devise</span>
      <select id="sCurrency" v-model="S.currency">
        <option v-for="c in CURRENCIES" :key="c">{{ c }}</option>
      </select>
    </label>
  </div>

  <div class="card">
    <h3>Rêves</h3>
    <button
      v-for="x in S.goals"
      :key="x.id"
      class="list-btn"
      @click="ui.open('GoalSheet', { id: x.id })"
    >
      <span class="ico" :style="{ background: `url('${goalPhoto(x)}') center/cover` }" />
      <span class="mid">
        {{ x.name }}
        <br />
        <span class="muted small">
          {{ money0(savedOf(x)) }} / {{ money0(x.target) }}{{ x === g ? ' · rêve actif' : '' }}
        </span>
      </span>
      <span class="muted"><Icon name="right" :size="18" /></span>
    </button>
    <button class="secondary" @click="ui.open('GoalSheet', {})">
      <Icon name="plus" :size="18" />
      Nouveau rêve
    </button>
  </div>

  <div class="card">
    <h3>Charges fixes · {{ money0(sum(S.fixed, f => f.amount)) }} / mois</h3>
    <p class="hint" style="margin: 0 0 6px">
      Loyer, assurance, forfait… Les abonnements se gèrent dans leur onglet.
    </p>
    <button
      v-for="f in S.fixed"
      :key="f.id"
      class="list-btn"
      @click="ui.open('FixedSheet', { id: f.id })"
    >
      <span class="ico" style="--c: var(--muted)"><Icon :name="f.icon" /></span>
      <span class="mid">
        {{ f.name }}
        <br />
        <span class="muted small">le {{ f.day || 1 }} du mois</span>
      </span>
      <span class="num">{{ money(f.amount) }}</span>
    </button>
    <button class="secondary" @click="ui.open('FixedSheet', {})">
      <Icon name="plus" :size="18" />
      Ajouter une charge
    </button>
  </div>

  <div v-for="type in ['expense', 'income']" :key="type" class="card">
    <h3>{{ type === 'expense' ? 'Catégories du quotidien' : 'Catégories de revenus' }}</h3>
    <button
      v-for="c in cats(type)"
      :key="c.id"
      class="list-btn"
      @click="ui.open('CategorySheet', { id: c.id })"
    >
      <span class="ico" :style="{ '--c': c.color }"><Icon :name="c.icon" /></span>
      <span class="mid">{{ c.name }}</span>
      <span class="muted"><Icon name="right" :size="18" /></span>
    </button>
    <button class="secondary" @click="ui.open('CategorySheet', { type })">
      <Icon name="plus" :size="18" />
      Nouvelle catégorie
    </button>
  </div>

  <div class="card">
    <h3>Fonctionnalités</h3>
    <p class="hint" style="margin: 0 0 6px">
      Active seulement ce qui te sert. Rien n’est effacé quand tu désactives.
    </p>
    <button
      v-for="m in MODULES"
      :key="m.k"
      class="modrow"
      data-a="module"
      :data-k="m.k"
      role="switch"
      :aria-checked="mod(m.k)"
      @click="toggleModule(m.k)"
    >
      <span class="mid">
        <b>{{ m.t }}</b>
        <br />
        <span class="muted small">{{ m.d }}</span>
      </span>
      <span class="switch" :class="{ on: mod(m.k) }"><i /></span>
    </button>
    <div v-if="mod('check') && S.anchor" class="field" style="margin: 12px 0 0">
      <span>Ton épargne (rêve, coffres) est…</span>
      <Seg
        :model-value="S.savingsSeparate !== false"
        :options="[
          [true, 'Sur un autre compte'],
          [false, 'Sur le compte courant']
        ]"
        style="margin: 0"
        @update:model-value="v => (S.savingsSeparate = v)"
      />
    </div>
  </div>

  <div class="card">
    <h3>Rappels</h3>
    <p v-if="!supported || !standalone" class="hint" style="margin: 0 0 12px">
      Les notifications marchent quand l’appli est installée sur l’écran d’accueil de ton iPhone
      (iOS 16.4 ou plus). Tu peux déjà régler tes horaires ici.
    </p>
    <button
      class="modrow"
      role="switch"
      :aria-checked="P.daily.on"
      @click="
        P.daily.on = !P.daily.on;
        prefs();
      "
    >
      <span class="mid">
        <b>Rappel du soir</b>
        <br />
        <span class="muted small">
          « Tu as dépensé quelque chose aujourd’hui ? » Pas envoyé si tu as déjà noté une dépense ou
          une journée sans dépense.
        </span>
      </span>
      <span class="switch" :class="{ on: P.daily.on }"><i /></span>
    </button>
    <label v-if="P.daily.on" class="field" style="margin: 8px 0">
      <span>Heure</span>
      <input id="pDailyTime" v-model="P.daily.time" type="time" @change="prefs" />
    </label>
    <button
      class="modrow"
      role="switch"
      :aria-checked="P.weekly.on"
      @click="
        P.weekly.on = !P.weekly.on;
        prefs();
      "
    >
      <span class="mid">
        <b>Point hebdo</b>
        <br />
        <span class="muted small">
          Un rappel en fin de semaine pour comparer ton solde bancaire avec l’appli. Pas envoyé si
          le point est déjà fait.
        </span>
      </span>
      <span class="switch" :class="{ on: P.weekly.on }"><i /></span>
    </button>
    <div v-if="P.weekly.on" class="two" style="margin-top: 8px">
      <label class="field">
        <span>Jour</span>
        <select id="pWeeklyDay" v-model.number="P.weekly.day" @change="prefs">
          <option v-for="(d, i) in days" :key="i" :value="i">{{ cap(d) }}</option>
        </select>
      </label>
      <label class="field">
        <span>Heure</span>
        <input id="pWeeklyTime" v-model="P.weekly.time" type="time" @change="prefs" />
      </label>
    </div>
    <details class="impknown" :open="!P.server">
      <summary class="small muted">Serveur de rappels</summary>
      <label class="field" style="margin-top: 10px">
        <span>Adresse du serveur</span>
        <input
          id="pServer"
          v-model.lazy.trim="P.server"
          placeholder="https://cap-rappels.ton-pseudo.workers.dev"
          autocapitalize="off"
          autocorrect="off"
        />
      </label>
      <label class="field">
        <span>Clé publique</span>
        <input
          id="pVapid"
          v-model.lazy.trim="P.vapid"
          placeholder="BF…"
          autocapitalize="off"
          autocorrect="off"
        />
      </label>
    </details>
    <div v-if="P.on" class="row" style="margin-top: 12px">
      <span class="badge b-keep">Rappels actifs</span>
      <span style="display: flex; gap: 8px">
        <button class="minibtn ghost" @click="testPush">Tester</button>
        <button class="minibtn ghost" @click="disablePush">Désactiver</button>
      </span>
    </div>
    <button v-else class="primary" style="margin-top: 12px" @click="enablePush">
      <Icon name="bolt" :size="18" />
      Activer les notifications
    </button>
  </div>

  <div class="card">
    <h3>Données</h3>
    <p class="hint" style="margin: 0 0 10px">
      Tout est stocké uniquement sur cet appareil, photos comprises. Fais une sauvegarde de temps en
      temps.
    </p>
    <button class="secondary" data-a="import" @click="ui.open('ImportSheet', {})">
      <Icon name="table" :size="18" />
      Importer un relevé bancaire (CSV)
    </button>
    <button class="secondary" @click="backup">
      <Icon name="download" :size="18" />
      Sauvegarder (avec photos)
    </button>
    <button class="secondary" @click="restore">
      <Icon name="upload" :size="18" />
      Restaurer une sauvegarde
    </button>
    <button class="secondary" @click="exportCSV">
      <Icon name="table" :size="18" />
      Exporter les opérations (CSV)
    </button>
    <button class="secondary" data-a="demo" @click="loadDemo">
      <Icon name="sparkles" :size="18" />
      Charger les données de démo
    </button>
    <button class="danger fill" @click="reset">Tout effacer</button>
  </div>
</template>
