<script setup>
import { reactive, computed } from 'vue';
import Icon from './Icon.vue';
import { APP_NAME } from '../config.js';
import {
  S,
  uid,
  today,
  parseAmount,
  curSym,
  cap,
  DEFAULT_ART,
  demoState
} from '../domain/model.js';
import { useData } from '../stores/data.js';
import { useUI } from '../stores/ui.js';
import { pickPhoto } from '../utils/files.js';

const data = useData();
const ui = useUI();
const OB = reactive({
  step: 0,
  name: S.name || '',
  goal: '',
  target: '',
  photo: null,
  income: '',
  plan: '',
  fixed: [{ name: 'Loyer', amount: '' }]
});
const blur = computed(
  () =>
    [
      'blur(18px) grayscale(1) brightness(.55)',
      'blur(10px) grayscale(.6) brightness(.6)',
      'blur(6px) grayscale(.3) brightness(.6)',
      'blur(2px) grayscale(0) brightness(.6)'
    ][OB.step]
);
const calc = computed(() => {
  const t = parseAmount(OB.target),
    p = parseAmount(OB.plan),
    inc = parseAmount(OB.income);
  if (!(t > 0) || !(p > 0)) return '';
  const d = new Date();
  d.setDate(d.getDate() + Math.round((t / p) * 30.44));
  const when = cap(d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
  let s = `À ce rythme, « ${OB.goal || 'ton rêve'} » sera atteint en ${when}.`;
  if (inc > 0) s += ` C’est ${Math.round((p / inc) * 100)} % de tes revenus.`;
  return s;
});
function next() {
  if (OB.step === 1 && (!OB.goal.trim() || !(parseAmount(OB.target) > 0)))
    return ui.toast('Donne un nom et un montant à ton rêve');
  OB.step++;
}
async function photo() {
  try {
    const p = await pickPhoto();
    if (p) OB.photo = p;
  } catch (e) {
    ui.toast('Impossible de lire cette photo');
  }
}
async function finish() {
  S.name = OB.name.trim();
  S.income = parseAmount(OB.income) || 0;
  S.savingsPlan = parseAmount(OB.plan) || 0;
  S.createdAt = S.createdAt || today();
  S.fixed = OB.fixed
    .filter(f => f.name.trim() && parseAmount(f.amount) > 0)
    .map(f => ({
      id: uid(),
      name: f.name.trim(),
      amount: parseAmount(f.amount),
      day: 1,
      icon: /loyer|logement/i.test(f.name)
        ? 'home'
        : /assur/i.test(f.name)
          ? 'receipt'
          : /forfait|mobile|t[ée]l/i.test(f.name)
            ? 'phone'
            : 'box'
    }));
  const target = parseAmount(OB.target);
  if (OB.goal.trim() && target > 0) {
    const g = {
      id: uid(),
      name: OB.goal.trim(),
      target,
      photoId: null,
      createdAt: today(),
      deposits: []
    };
    if (OB.photo) {
      g.photoId = 'p-' + uid();
      await data.setPhoto(g.photoId, OB.photo);
    }
    S.goals.push(g);
    S.activeGoalId = g.id;
  }
  S.onboarded = true;
}
async function demo() {
  S.name = OB.name.trim();
  await data.replaceAll(demoState());
}
</script>

<template>
  <div id="onb">
    <div
      class="bgo"
      :style="{ backgroundImage: `url('${OB.photo || DEFAULT_ART}')`, filter: blur }"
    />
    <div class="inner">
      <template v-if="OB.step === 0">
        <div class="step">{{ APP_NAME }}</div>
        <h1>Ton argent sert un rêve.</h1>
        <p class="lead">
          Ici, tu ne suis pas des dépenses : tu écris l’histoire d’un rêve. Chaque euro économisé
          révèle un peu plus sa photo.
        </p>
        <label class="field">
          <span>Comment tu t’appelles ?</span>
          <input id="oName" v-model="OB.name" placeholder="Ton prénom" autocomplete="given-name" />
        </label>
        <div class="grow" />
        <button class="primary" data-a="onext" @click="next">Commencer</button>
        <button class="link" data-a="odemo" @click="demo">Explorer avec des données de démo</button>
      </template>
      <template v-else-if="OB.step === 1">
        <div class="step">1 / 3 · Ton rêve</div>
        <h1>Qu’est-ce qui te fait avancer{{ OB.name ? ', ' + OB.name : '' }} ?</h1>
        <p class="lead">
          Un voyage, un objet, un filet de sécurité… Choisis une photo : elle sera floue au début,
          et nette le jour où tu y arrives.
        </p>
        <button
          class="photo-pick"
          data-a="ophoto"
          :style="{
            width: '100%',
            backgroundImage: `url('${OB.photo || DEFAULT_ART}')`,
            marginBottom: '16px'
          }"
          @click="photo"
        >
          <span>
            <Icon name="image" :size="18" />
            {{ OB.photo ? 'Changer la photo' : 'Choisir dans mes photos' }}
          </span>
        </button>
        <label class="field">
          <span>Ton rêve</span>
          <input id="oGoal" v-model="OB.goal" placeholder="Billet pour Kinshasa" />
        </label>
        <label class="field">
          <span>Il coûte ({{ curSym() }})</span>
          <input id="oTarget" v-model="OB.target" inputmode="decimal" placeholder="950" />
        </label>
        <div class="grow" />
        <button class="primary" data-a="onext" @click="next">Continuer</button>
        <button class="secondary" @click="OB.step--">Retour</button>
      </template>
      <template v-else-if="OB.step === 2">
        <div class="step">2 / 3 · Ton rythme</div>
        <h1>Combien entre, combien tu mets de côté ?</h1>
        <p class="lead">
          {{ APP_NAME }} calcule chaque jour ce que tu peux dépenser sans ralentir ton rêve.
        </p>
        <label class="field">
          <span>Tes revenus par mois ({{ curSym() }})</span>
          <input id="oIncome" v-model="OB.income" inputmode="decimal" placeholder="1 450" />
        </label>
        <label class="field">
          <span>Pour ton rêve, chaque mois ({{ curSym() }})</span>
          <input id="oPlan" v-model="OB.plan" inputmode="decimal" placeholder="150" />
        </label>
        <div class="calc">{{ calc }}</div>
        <div class="grow" />
        <button class="primary" data-a="onext" @click="next">Continuer</button>
        <button class="secondary" @click="OB.step--">Retour</button>
      </template>
      <template v-else>
        <div class="step">3 / 3 · Tes charges fixes</div>
        <h1>Ce qui part chaque mois, quoi qu’il arrive.</h1>
        <p class="lead">
          Loyer, assurance, forfait… Les abonnements, on les verra un par un juste après.
        </p>
        <div v-for="(f, i) in OB.fixed" :key="i" class="fixrow">
          <input v-model="f.name" class="fn" placeholder="Charge" />
          <input v-model="f.amount" class="fa" inputmode="decimal" placeholder="0" />
          <button aria-label="Retirer" @click="OB.fixed.splice(i, 1)">
            <Icon name="x" :size="18" />
          </button>
        </div>
        <button
          class="secondary"
          style="margin-bottom: 20px"
          @click="OB.fixed.push({ name: '', amount: '' })"
        >
          <Icon name="plus" :size="18" />
          Ajouter une charge
        </button>
        <div class="grow" />
        <button class="primary" data-a="ofinish" @click="finish">C’est parti</button>
        <button class="secondary" @click="OB.step--">Retour</button>
      </template>
    </div>
  </div>
</template>
