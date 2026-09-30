<script setup>
import { computed, ref, onBeforeMount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import Bar from '../components/Bar.vue';
import {
  S,
  uid,
  money,
  money0,
  parseAmount,
  impact,
  gState,
  getList,
  listMeta,
  listEstimate,
  basketOf,
  plannedBought,
  lineTotal,
  AISLES
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';
const props = defineProps({ listKey: String });
const ui = useUI();
const router = useRouter();
const k = computed(() => decodeURIComponent(props.listKey || ''));
onBeforeMount(() => {
  if (!/^\d{4}-\d{2}:(M|W[1-4])$/.test(k.value)) return router.replace('/courses');
  getList(k.value, true);
});
const L = computed(() => gState().lists[k.value]);
const meta = computed(() => (L.value ? listMeta(k.value) : null));
const est = computed(() => (L.value ? listEstimate(L.value) : 0));
const bask = computed(() => (L.value ? basketOf(L.value) : 0));
const started = computed(() => L.value && L.value.items.some(i => i.checked));
const env = computed(() => (meta.value ? (meta.value.isM ? est.value : meta.value.env) : 0));
const groups = computed(() =>
  AISLES.map(a => ({
    a,
    its: L.value.items.filter(i => i.aisle === a || (a === 'Autre' && !AISLES.includes(i.aisle)))
  })).filter(g => g.its.length)
);
const sugg = computed(() => {
  const inList = new Set(L.value.items.map(i => i.itemId));
  return gState()
    .items.filter(i => !inList.has(i.id))
    .slice(0, 14);
});
const newName = ref('');
const newPrice = ref('');
const inp = ref(null);
async function add() {
  const n = newName.value.trim();
  if (!n) {
    inp.value && inp.value.focus();
    return;
  }
  const cat = gState().items.find(x => x.name.toLowerCase() === n.toLowerCase());
  const p = parseAmount(newPrice.value);
  const st = started.value && !L.value.done;
  L.value.items.push({
    id: uid(),
    itemId: cat ? cat.id : null,
    name: cat ? cat.name : n,
    aisle: cat ? cat.aisle : 'Autre',
    price: p >= 0 ? p : cat ? cat.price : 0,
    qty: cat ? cat.qty : 1,
    checked: st,
    offList: st
  });
  newName.value = '';
  newPrice.value = '';
  await nextTick();
  inp.value && inp.value.focus();
  if (st) ui.toast(`${n} ajouté hors liste`, p > 0 ? impact(p) : '');
}
function addCat(it) {
  const st = started.value && !L.value.done;
  L.value.items.push({
    id: uid(),
    itemId: it.id,
    name: it.name,
    aisle: it.aisle,
    price: it.price,
    qty: it.qty || 1,
    checked: st,
    offList: st
  });
}
function refill() {
  delete gState().lists[k.value];
  getList(k.value, true);
  ui.toast('Liste rechargée');
}
const notTaken = computed(() => L.value.items.filter(i => !i.checked).length);
</script>

<template>
  <template v-if="L && meta">
    <div class="vhead">
      <button class="icon-btn" aria-label="Retour" data-a="gback" @click="router.push('/courses')">
        <Icon name="left" :size="24" />
      </button>
      <div style="flex: 1">
        <h1>{{ meta.title }}</h1>
        <div class="sub">{{ meta.sub }}</div>
      </div>
    </div>
    <div class="card">
      <div class="statline" style="margin-bottom: 8px">
        <div class="fact">
          <div class="k">Liste prévue</div>
          <div class="v">{{ money(est) }}</div>
        </div>
        <div class="fact">
          <div class="k">Dans le panier</div>
          <div class="v">{{ money(bask) }}</div>
        </div>
        <div class="fact">
          <div class="k">{{ meta.isM ? 'Budget stock' : 'Enveloppe' }}</div>
          <div class="v">{{ money0(meta.isM ? meta.G.planM : env) }}</div>
        </div>
      </div>
      <Bar :pct="env > 0 ? (bask / env) * 100 : 0" />
      <div v-if="!meta.isM && est > env + 0.5" class="muted small warnc">
        Ta liste dépasse l’enveloppe de {{ money0(est - env) }}. Retire ou remplace un article avant
        de partir.
      </div>
      <div v-if="!meta.isM && meta.other > 0" class="muted small">
        Déjà dépensé en courses cette semaine hors liste : {{ money0(meta.other) }}.
      </div>
      <div v-if="L.done" class="ins" style="margin-top: 10px">
        <Icon name="checkCircle" :size="18" />
        <div>
          Courses faites · ticket de
          <b>{{ money(L.ticket) }}</b>
          pour {{ money(plannedBought(L)) }} prévus
          <template v-if="started && notTaken">
            ({{ notTaken }} article{{ notTaken > 1 ? 's' : '' }} non pris)
          </template>
          .
        </div>
      </div>
    </div>

    <div class="card">
      <div v-if="!L.items.length" class="empty">Liste vide. Ajoute des articles ci-dessous.</div>
      <template v-for="g in groups" :key="g.a">
        <div class="aisle">{{ g.a }}</div>
        <div v-for="i in g.its" :key="i.id" class="gi" :class="{ on: i.checked }">
          <button
            class="chk"
            data-a="gcheck"
            :aria-label="'Cocher ' + i.name"
            @click="i.checked = !i.checked"
          >
            <Icon v-if="i.checked" name="check" :size="16" />
          </button>
          <button class="gtxt" @click="ui.open('ListItemSheet', { listKey: k, id: i.id })">
            <span class="nm">
              {{ i.name }}
              <span v-if="i.qty > 1" class="muted">×{{ i.qty }}</span>
              <span v-if="i.offList" class="badge b-question">hors liste</span>
            </span>
            <span class="num muted">{{ money(lineTotal(i)) }}</span>
          </button>
        </div>
      </template>
      <form class="gadd" @submit.prevent="add">
        <input
          id="gNew"
          ref="inp"
          v-model="newName"
          placeholder="Ajouter un article…"
          autocomplete="off"
          enterkeyhint="done"
        />
        <input id="gNewPrice" v-model="newPrice" inputmode="decimal" placeholder="Prix" />
        <button class="minibtn" type="submit" aria-label="Ajouter">
          <Icon name="plus" :size="16" />
        </button>
      </form>
      <p v-if="started && !L.done" class="hint" style="margin: 6px 0 0">
        Tu as commencé tes courses : ce que tu ajoutes maintenant est marqué hors liste.
      </p>
      <template v-if="sugg.length">
        <div class="small muted" style="margin: 14px 0 8px">Depuis mes produits</div>
        <div class="chips">
          <button
            v-for="i in sugg"
            :key="i.id"
            class="chip"
            style="--c: var(--accent)"
            @click="addCat(i)"
          >
            <Icon name="plus" :size="14" />
            {{ i.name }}
          </button>
        </div>
      </template>
    </div>

    <button v-if="L.done" class="secondary" @click="ui.open('TicketSheet', { listKey: k })">
      Modifier le ticket
    </button>
    <button v-else class="primary" data-a="gfinish" @click="ui.open('TicketSheet', { listKey: k })">
      <Icon name="receipt" :size="18" />
      J’ai fini mes courses
    </button>
    <button v-if="!started && !L.done" class="secondary" @click="refill">
      Recharger depuis mes produits
    </button>
    <div style="height: 12px" />
  </template>
</template>
