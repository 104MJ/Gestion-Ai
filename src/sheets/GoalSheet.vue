<script setup>
import { reactive, computed } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import Icon from '../components/Icon.vue';
import {
  S,
  uid,
  today,
  amtStr,
  parseAmount,
  curSym,
  money,
  dayShort,
  activeGoal,
  photos,
  DEFAULT_ART
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';
import { useData } from '../stores/data.js';
import { pickPhoto } from '../utils/files.js';
const props = defineProps({ id: String });
const ui = useUI();
const data = useData();
const g = computed(() => (props.id ? S.goals.find(x => x.id === props.id) : null));
const F = reactive(
  g.value
    ? { name: g.value.name, target: amtStr(g.value.target), newPhoto: null }
    : { name: '', target: '', newPhoto: null }
);
const ph = computed(
  () => F.newPhoto || (g.value && g.value.photoId && photos[g.value.photoId]) || DEFAULT_ART
);
async function photo() {
  try {
    const p = await pickPhoto();
    if (p) F.newPhoto = p;
  } catch (e) {
    ui.toast('Impossible de lire cette photo');
  }
}
async function save() {
  const target = parseAmount(F.target);
  if (!F.name.trim()) return ui.toast('Donne un nom à ton rêve');
  if (!(target > 0)) return ui.toast('Montant invalide');
  let x = g.value;
  if (!x) {
    x = { id: uid(), name: '', target: 0, photoId: null, createdAt: today(), deposits: [] };
    S.goals.push(x);
    x = S.goals[S.goals.length - 1];
    if (!S.activeGoalId || S.goals.length === 1) S.activeGoalId = x.id;
  }
  x.name = F.name.trim();
  x.target = target;
  if (F.newPhoto) {
    if (x.photoId) await data.removePhoto(x.photoId);
    x.photoId = 'p-' + uid();
    await data.setPhoto(x.photoId, F.newPhoto);
  }
  ui.close();
  ui.toast('Rêve enregistré');
}
async function del() {
  if (!(await ui.ask('Supprimer ce rêve et ses versements ?'))) return;
  if (g.value.photoId) await data.removePhoto(g.value.photoId);
  S.goals = S.goals.filter(x => x.id !== props.id);
  if (S.activeGoalId === props.id) S.activeGoalId = S.goals[0] ? S.goals[0].id : null;
  ui.close();
}
const deposits = computed(() =>
  g.value
    ? g.value.deposits
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 12)
    : []
);
</script>
<template>
  <SheetHead :title="g ? 'Ton rêve' : 'Nouveau rêve'" />
  <button
    class="photo-pick"
    :style="{ width: '100%', backgroundImage: `url('${ph}')`, marginBottom: '14px' }"
    @click="photo"
  >
    <span>
      <Icon name="image" :size="18" />
      {{ F.newPhoto || (g && g.photoId) ? 'Changer la photo' : 'Choisir une photo' }}
    </span>
  </button>
  <label class="field">
    <span>Ton rêve</span>
    <input
      id="gName"
      v-model="F.name"
      maxlength="50"
      placeholder="Billet pour Kinshasa, MacBook, fonds de sécurité…"
    />
  </label>
  <label class="field">
    <span>Montant ({{ curSym() }})</span>
    <input id="gTarget" v-model="F.target" inputmode="decimal" placeholder="0" />
  </label>
  <button class="primary" @click="save">Enregistrer</button>
  <template v-if="g">
    <button
      v-if="g !== activeGoal()"
      class="secondary"
      @click="
        S.activeGoalId = g.id;
        ui.close();
        ui.toast('Nouveau rêve en ligne de mire');
      "
    >
      Faire de ce rêve mon objectif
    </button>
    <template v-if="deposits.length">
      <h3
        class="muted small"
        style="margin: 18px 0 6px; text-transform: uppercase; letter-spacing: 0.06em"
      >
        Versements
      </h3>
      <div
        v-for="d in deposits"
        :key="d.id"
        class="row"
        style="padding: 7px 0; border-bottom: 1px solid var(--line)"
      >
        <span>
          {{ d.note || 'Versement' }}
          <br />
          <span class="muted small">{{ dayShort(d.date) }}</span>
        </span>
        <span class="num pos">+{{ money(d.amount) }}</span>
      </div>
    </template>
    <button class="danger" @click="del">Supprimer ce rêve</button>
  </template>
</template>
