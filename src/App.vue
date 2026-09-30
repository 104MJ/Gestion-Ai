<script setup>
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from './components/Icon.vue';
import Background from './components/Background.vue';
import SheetHost from './components/SheetHost.vue';
import Onboarding from './components/Onboarding.vue';
import { S, mod } from './domain/model.js';
import { useUI } from './stores/ui.js';

const ui = useUI();
const route = useRoute();
const router = useRouter();
const onPhoto = computed(() => route.name === 'today');
watch(onPhoto, v => document.body.classList.toggle('on-photo', v), { immediate: true });

const tabs = computed(() =>
  [
    { to: '/', name: 'today', icon: 'sun', label: 'Aujourd’hui' },
    { to: '/depenses', name: 'expenses', icon: 'wallet', label: 'Dépenses', also: ['vaults'] },
    mod('courses') && {
      to: '/courses',
      name: 'courses',
      icon: 'cart',
      label: 'Courses',
      also: ['list']
    },
    { to: '/abonnements', name: 'subs', icon: 'repeat', label: 'Abonnements' },
    { to: '/histoire', name: 'story', icon: 'bookOpen', label: 'Histoire' }
  ].filter(Boolean)
);
const isActive = t => route.name === t.name || (t.also || []).includes(route.name);
const fabVisible = computed(() => ['today', 'expenses', 'subs'].includes(route.name));
function fab() {
  route.name === 'subs' ? ui.open('SubSheet', {}) : ui.open('TxSheet', {});
}

// Liens directs depuis les notifications : #/?do=depense ou #/?do=point
watch(
  () => [route.query.do, S.onboarded],
  ([d, ok]) => {
    if (!d || !ok) return;
    router.replace({ path: '/', query: {} });
    if (d === 'depense') ui.open('TxSheet', {});
    if (d === 'point' && mod('check')) ui.open('CheckSheet', {});
  },
  { immediate: true }
);
</script>

<template>
  <Background v-if="onPhoto" />
  <main id="app-main"><router-view /></main>
  <button v-show="fabVisible && S.onboarded" id="fab" aria-label="Ajouter" @click="fab">
    <Icon name="plus" :size="28" />
  </button>
  <nav class="tabs">
    <router-link v-for="t in tabs" :key="t.name" :to="t.to" custom v-slot="{ navigate }">
      <button :class="{ active: isActive(t) }" @click="navigate">
        <span><Icon :name="t.icon" :size="22" /></span>
        {{ t.label }}
      </button>
    </router-link>
  </nav>
  <SheetHost />
  <div v-if="ui.dialog" class="dlg open" @click.self="ui.answer(false)">
    <div class="dlg-box" role="dialog" aria-modal="true">
      <p>{{ ui.dialog.msg }}</p>
      <div class="dlg-btns">
        <button class="secondary" @click="ui.answer(false)">Annuler</button>
        <button
          :class="/supprim|effac|remplacer|résili/i.test(ui.dialog.msg) ? 'danger fill' : 'primary'"
          @click="ui.answer(true)"
        >
          {{
            /supprim|effac|remplacer|résili/i.test(ui.dialog.msg) && ui.dialog.ok === 'Confirmer'
              ? 'Oui, continuer'
              : ui.dialog.ok
          }}
        </button>
      </div>
    </div>
  </div>
  <div id="toast" :class="{ show: ui.toastMsg }">
    <template v-if="ui.toastMsg">
      {{ ui.toastMsg.msg }}
      <small v-if="ui.toastMsg.sub">{{ ui.toastMsg.sub }}</small>
    </template>
  </div>
  <Onboarding v-if="!S.onboarded" />
</template>
