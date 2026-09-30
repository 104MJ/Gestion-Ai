<script setup>
import { ref, reactive, onMounted } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import Icon from '../components/Icon.vue';
import Seg from '../components/Seg.vue';
import {
  S,
  uid,
  today,
  parseAmount,
  curSym,
  money,
  dayLong,
  cats,
  expectedBalance
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';
import { pushPing } from '../actions.js';
const ui = useUI();
const first = !S.anchor;
const real = ref('');
const res = ref(null);
const fix = reactive({ note: '', categoryId: 'c-other' });
onMounted(() =>
  setTimeout(() => {
    const el = document.getElementById('ckReal');
    el && el.focus();
  }, 260)
);
function start() {
  const r = parseAmount(real.value);
  if (!isFinite(r)) return ui.toast('Entre le solde de ton compte');
  S.anchor = { date: today(), ts: Date.now(), balance: r };
  ui.close();
  ui.toast('Suivi lancé', 'Prochain point dans une semaine.');
}
function compare() {
  const r = parseAmount(real.value);
  if (!isFinite(r)) return ui.toast('Entre le solde de ton compte');
  const exp = expectedBalance();
  res.value = { real: r, exp, diff: Math.round((r - exp) * 100) / 100 };
}
function commit(msg, sub) {
  const { real: r, exp, diff } = res.value;
  S.checks = (S.checks || []).concat({ date: today(), real: r, exp, diff });
  S.anchor = { date: today(), ts: Date.now() + 1, balance: r };
  ui.close();
  pushPing({ checked: today() });
  ui.toast(msg, sub);
}
function ok() {
  commit(
    Math.abs(res.value.diff) < 5 ? 'Point validé · tout est cohérent' : 'Point validé',
    'Prochain point dans une semaine.'
  );
}
function doFix() {
  const d = res.value.diff;
  S.transactions.push({
    id: uid(),
    type: d < 0 ? 'expense' : 'income',
    amount: Math.abs(d),
    categoryId: d < 0 ? fix.categoryId : 'i-other',
    date: today(),
    note: fix.note.trim() || (d < 0 ? 'Dépense oubliée' : 'Revenu oublié'),
    createdAt: Date.now(),
    fromCheck: true
  });
  commit('Écart corrigé', 'Ton budget du jour est recalculé.');
}
</script>
<template>
  <template v-if="!res">
    <SheetHead :title="first ? 'Suivi avec ta banque' : 'Point hebdo'" />
    <p class="hint" style="margin: 0 0 14px">
      {{
        first
          ? 'L’appli n’est pas reliée à ta banque. Pour vérifier qu’il ne manque rien, ouvre ton appli bancaire et donne le solde de ton compte courant. Chaque semaine, on comparera avec ce qui est attendu.'
          : `Ouvre ton appli bancaire et recopie le solde actuel de ton compte courant. Dernier point : ${dayLong(S.anchor.date).toLowerCase()}, ${money(S.anchor.balance)}.`
      }}
    </p>
    <form @submit.prevent="first ? start() : compare()">
      <label class="field">
        <span>Solde réel aujourd’hui ({{ curSym() }})</span>
        <input id="ckReal" v-model="real" class="amount" inputmode="decimal" placeholder="0,00" />
      </label>
      <div v-if="first" class="field">
        <span>Ton épargne (rêve, coffres) est…</span>
        <Seg
          :model-value="S.savingsSeparate !== false"
          :options="[
            [true, 'Sur un autre compte'],
            [false, 'Sur ce compte']
          ]"
          style="margin: 0"
          @update:model-value="v => (S.savingsSeparate = v)"
        />
      </div>
      <button class="primary" type="submit" :data-a="first ? 'ckstart' : 'ckcompare'">
        {{ first ? 'Lancer le suivi' : 'Comparer' }}
      </button>
    </form>
    <button v-if="!first" class="secondary" @click="ui.open('ImportSheet', {})">
      <Icon name="table" :size="18" />
      D’abord importer mon relevé CSV
    </button>
  </template>
  <template v-else>
    <SheetHead title="Point hebdo" />
    <div class="statline">
      <div class="fact">
        <div class="k">Attendu</div>
        <div class="v">{{ money(res.exp) }}</div>
      </div>
      <div class="fact">
        <div class="k">Sur ton compte</div>
        <div class="v">{{ money(res.real) }}</div>
      </div>
      <div class="fact">
        <div class="k">Écart</div>
        <div class="v" :class="Math.abs(res.diff) < 5 ? 'pos' : 'neg'">
          {{ res.diff > 0 ? '+' : '' }}{{ money(res.diff) }}
        </div>
      </div>
    </div>
    <template v-if="Math.abs(res.diff) < 5">
      <div class="ins">
        <Icon name="checkCircle" :size="18" />
        <div>
          <b>Tout est cohérent.</b>
          Tes saisies correspondent à ton compte : ton budget reflète la réalité.
        </div>
      </div>
      <button class="primary" data-a="ckok" @click="ok">Valider le point</button>
    </template>
    <template v-else>
      <div class="ins">
        <Icon :name="res.diff < 0 ? 'alert' : 'sparkles'" :size="18" />
        <div v-if="res.diff < 0">
          <b>{{ money(-res.diff) }} sont sortis sans être notés.</b>
          Un café, un retrait, un prélèvement oublié ? Ajoute-le pour que ton budget du jour reste
          juste.
        </div>
        <div v-else>
          <b>{{ money(res.diff) }} de plus que prévu.</b>
          Un revenu ou un remboursement oublié ? Ou une dépense notée deux fois ?
        </div>
      </div>
      <label class="field" style="margin-top: 10px">
        <span>{{ res.diff < 0 ? 'Ce que c’était (si tu t’en souviens)' : 'D’où ça vient' }}</span>
        <input
          id="ckNote"
          v-model="fix.note"
          maxlength="50"
          :placeholder="res.diff < 0 ? 'Dépense oubliée' : 'Revenu oublié'"
        />
      </label>
      <div v-if="res.diff < 0" class="field">
        <span>Catégorie</span>
        <div class="chips">
          <button
            v-for="c in cats('expense')"
            :key="c.id"
            class="chip"
            :class="{ on: c.id === fix.categoryId }"
            :style="{ '--c': c.color }"
            @click="fix.categoryId = c.id"
          >
            <Icon :name="c.icon" :size="16" />
            {{ c.name }}
          </button>
        </div>
      </div>
      <button class="primary" data-a="ckfix" @click="doFix">
        Ajouter {{ money(Math.abs(res.diff)) }} {{ res.diff < 0 ? 'de dépenses' : 'de revenu' }} et
        valider
      </button>
      <button class="secondary" data-a="ckok" @click="ok">Valider sans corriger</button>
    </template>
  </template>
</template>
