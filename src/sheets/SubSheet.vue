<script setup>
import { reactive, computed } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import Icon from '../components/Icon.vue';
import Seg from '../components/Seg.vue';
import IconGrid from '../components/IconGrid.vue';
import Swatches from '../components/Swatches.vue';
import {
  S,
  COLORS,
  FREQ,
  uid,
  today,
  addDays,
  amtStr,
  parseAmount,
  curSym,
  money,
  money0,
  monthlyEq,
  paidSoFar
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const props = defineProps({ id: String, trial: Boolean });
const ui = useUI();
const s = computed(() => (props.id ? S.subs.find(x => x.id === props.id) : null));
const d30 = addDays(today(), 30);
const F = reactive(
  s.value
    ? { ...s.value, price: amtStr(s.value.price), trial: !!s.value.trialEnd }
    : {
        id: null,
        name: '',
        price: '',
        freq: 'month',
        startDate: props.trial ? d30 : today(),
        trialEnd: props.trial ? d30 : '',
        trial: !!props.trial,
        icon: 'film',
        color: COLORS[(S.subs.length * 3) % COLORS.length],
        usage: '',
        verdict: ''
      }
);
const freqs = Object.entries(FREQ).map(([k, l]) => [k, 'Par ' + l]);
function setTrial(v) {
  F.trial = v;
  if (v && !F.trialEnd) F.trialEnd = F.startDate;
}
function saveSub() {
  const price = parseAmount(F.price);
  if (!F.name.trim()) return ui.toast('Donne un nom à l’abonnement');
  if (!(price > 0)) return ui.toast('Prix invalide');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(F.startDate))
    return ui.toast('Choisis la date du premier prélèvement');
  const old = s.value;
  const rec = {
    id: F.id || uid(),
    name: F.name.trim(),
    price,
    freq: F.freq,
    startDate: F.startDate,
    trialEnd: F.trial ? F.trialEnd || today() : '',
    icon: F.icon,
    color: F.color,
    usage: F.usage,
    verdict: F.verdict,
    uses: old ? old.uses : [],
    cancelledAt: old ? old.cancelledAt : null,
    trialKeep: old ? old.trialKeep : false
  };
  if (old) Object.assign(old, rec);
  else S.subs.push(rec);
  ui.close();
  ui.toast(
    old ? 'Abonnement modifié' : 'Abonnement ajouté',
    `${money0(monthlyEq(rec) * 12)} par an`
  );
}
function used() {
  s.value.uses.push(today());
  s.value.uses.sort();
  ui.toast(
    `Utilisation notée · ${s.value.uses.length} au total`,
    `${money(paidSoFar(s.value) / s.value.uses.length)} par utilisation`
  );
}
function cancel() {
  s.value.cancelledAt = today();
  ui.close();
  ui.toast(`${s.value.name} résilié`, `+${money0(monthlyEq(s.value) * 12)} par an`);
}
function reactivate() {
  s.value.cancelledAt = null;
  ui.close();
  ui.toast(`${s.value.name} réactivé`);
}
async function del() {
  if (await ui.ask('Supprimer cet abonnement de la liste (et son historique) ?')) {
    S.subs = S.subs.filter(x => x.id !== F.id);
    ui.close();
  }
}
</script>
<template>
  <SheetHead :title="F.id ? F.name : props.trial ? 'Nouvel essai gratuit' : 'Nouvel abonnement'" />
  <template v-if="s">
    <div class="statline">
      <div class="fact">
        <div class="k">Payé au total</div>
        <div class="v">{{ money0(paidSoFar(s)) }}</div>
      </div>
      <div class="fact">
        <div class="k">Par an</div>
        <div class="v">{{ money0(monthlyEq(s) * 12) }}</div>
      </div>
      <div class="fact">
        <div class="k">Coût / usage</div>
        <div class="v">
          {{ s.uses.length && paidSoFar(s) > 0 ? money(paidSoFar(s) / s.uses.length) : '—' }}
        </div>
      </div>
    </div>
    <button v-if="!s.cancelledAt" class="secondary" style="margin: 0 0 16px" @click="used">
      <Icon name="checkCircle" :size="18" />
      Je l’ai utilisé aujourd’hui · {{ s.uses.length }} fois au total
    </button>
  </template>
  <label class="field">
    <span>Nom</span>
    <input id="uName" v-model="F.name" maxlength="40" placeholder="Netflix, Spotify, Basic-Fit…" />
  </label>
  <div class="two">
    <label class="field">
      <span>Prix ({{ curSym() }})</span>
      <input id="uPrice" v-model="F.price" inputmode="decimal" placeholder="0,00" />
    </label>
    <label class="field">
      <span>Premier prélèvement</span>
      <input id="uStart" v-model="F.startDate" type="date" />
    </label>
  </div>
  <div class="field">
    <span>Fréquence</span>
    <Seg v-model="F.freq" :options="freqs" style="margin: 0" />
  </div>
  <div class="field">
    <span>Essai gratuit</span>
    <Seg
      :model-value="F.trial"
      :options="[
        [false, 'Non'],
        [true, 'Oui']
      ]"
      style="margin: 0"
      @update:model-value="setTrial"
    />
  </div>
  <label v-if="F.trial" class="field">
    <span>Fin de l’essai</span>
    <input id="uTrial" v-model="F.trialEnd" type="date" />
  </label>
  <div class="field">
    <span>Tu l’utilises…</span>
    <Seg
      v-model="F.usage"
      toggle
      :options="[
        ['often', 'Souvent'],
        ['sometimes', 'Parfois'],
        ['never', 'Jamais']
      ]"
      style="margin: 0"
    />
  </div>
  <div class="field">
    <span>Ton verdict</span>
    <Seg
      v-model="F.verdict"
      toggle
      :options="[
        ['keep', 'Garder'],
        ['question', 'Questionner'],
        ['cancel', 'Résilier']
      ]"
      style="margin: 0"
    />
  </div>
  <div class="field">
    <span>Icône</span>
    <IconGrid v-model="F.icon" :color="F.color" />
  </div>
  <div class="field">
    <span>Couleur</span>
    <Swatches v-model="F.color" />
  </div>
  <button class="primary" data-a="usave" @click="saveSub">Enregistrer</button>
  <template v-if="s">
    <button v-if="s.cancelledAt" class="secondary" @click="reactivate">
      Réactiver l’abonnement
    </button>
    <button v-else class="secondary" @click="cancel">Je l’ai résilié</button>
    <button class="danger" @click="del">Supprimer de la liste</button>
  </template>
</template>
