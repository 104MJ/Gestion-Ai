<script setup>
import { ref, computed } from 'vue';
import SheetHead from '../components/SheetHead.vue';
import Icon from '../components/Icon.vue';
import {
  S,
  uid,
  today,
  sum,
  money,
  dayShort,
  cats,
  parseCSV,
  readStatement,
  classify,
  readFileText,
  normTxt,
  mod
} from '../domain/model.js';
import { useUI } from '../stores/ui.js';
import { pushPing } from '../actions.js';
import { pickFile } from '../utils/files.js';
const ui = useUI();
const rows = ref(null);
async function pick() {
  const f = await pickFile('.csv,text/csv,text/plain,.txt');
  if (!f) return;
  try {
    const r = readStatement(parseCSV(await readFileText(f)));
    if (!r.length)
      return ui.toast(
        'Aucune opération trouvée dans ce fichier',
        'Vérifie qu’il s’agit bien d’un export CSV de ta banque.'
      );
    rows.value = classify(r);
  } catch (e) {
    ui.toast('Impossible de lire ce fichier');
  }
}
const miss = computed(() => rows.value.filter(r => r.kind === 'missing'));
const known = computed(() => rows.value.filter(r => r.kind === 'known'));
const before = computed(() => rows.value.filter(r => r.kind === 'before'));
const sel = computed(() => miss.value.filter(r => r.on));
function save() {
  S.labelCats = { ...(S.labelCats || {}) };
  sel.value.forEach(r => {
    S.transactions.push({
      id: uid(),
      type: r.type,
      amount: Math.abs(r.amount),
      categoryId: r.cat,
      date: r.date,
      note: r.clean,
      createdAt: Date.now(),
      imported: true,
      bankLabel: r.label
    });
    S.labelCats[normTxt(r.clean).slice(0, 14)] = r.cat;
  });
  const n = sel.value.length;
  ui.close();
  pushPing({ logged: today() });
  ui.toast(
    `${n} opération${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''}`,
    mod('check') ? 'Fais ton point hebdo : l’écart devrait avoir disparu.' : ''
  );
}
</script>
<template>
  <template v-if="!rows">
    <SheetHead title="Importer mon relevé" />
    <p class="hint" style="margin: 0 0 12px">
      Exporte tes opérations depuis le site ou l’appli de ta banque (format CSV), puis choisis le
      fichier. L’appli repère ce que tu as oublié de noter. Le fichier reste sur ton téléphone.
    </p>
    <button class="primary" data-a="impick" @click="pick">
      <Icon name="upload" :size="18" />
      Choisir le fichier CSV
    </button>
    <p class="hint" style="margin: 12px 0 0">
      Reconnu automatiquement : les dépenses déjà notées, tes abonnements, tes charges fixes et les
      virements vers ton épargne.
    </p>
  </template>
  <template v-else>
    <SheetHead title="Relevé importé" />
    <div class="statline">
      <div class="fact">
        <div class="k">Lignes lues</div>
        <div class="v">{{ rows.length }}</div>
      </div>
      <div class="fact">
        <div class="k">Déjà connues</div>
        <div class="v">{{ known.length }}</div>
      </div>
      <div class="fact">
        <div class="k">Oubliées</div>
        <div class="v" :class="miss.length ? 'neg' : 'pos'">{{ miss.length }}</div>
      </div>
    </div>
    <p v-if="rows.length" class="hint" style="margin: -4px 0 12px">
      Du {{ dayShort(rows[0].date) }} au {{ dayShort(rows[rows.length - 1].date) }}
      <template v-if="before.length">
        · {{ before.length }} ligne{{ before.length > 1 ? 's' : '' }} avant le début de ton suivi
        ignorée{{ before.length > 1 ? 's' : '' }}
      </template>
      .
    </p>
    <template v-if="!miss.length">
      <div class="ins">
        <Icon name="checkCircle" :size="18" />
        <div>
          <b>Rien n’a été oublié.</b>
          Toutes les opérations de ton relevé sont déjà dans l’appli.
        </div>
      </div>
      <button class="primary" @click="ui.close()">Parfait</button>
    </template>
    <template v-else>
      <h3
        class="muted small"
        style="margin: 6px 0; text-transform: uppercase; letter-spacing: 0.06em"
      >
        À ajouter
      </h3>
      <div v-for="(r, i) in miss" :key="i" class="improw" :class="{ off: !r.on }">
        <button class="chk" :class="{ onck: r.on }" aria-label="Inclure" @click="r.on = !r.on">
          <Icon v-if="r.on" name="check" :size="16" />
        </button>
        <div class="mid">
          <div class="row">
            <b class="nm">{{ r.clean }}</b>
            <span class="num" :class="{ pos: r.amount > 0 }">
              {{ r.amount > 0 ? '+' : '−' }}{{ money(Math.abs(r.amount)) }}
            </span>
          </div>
          <div class="row small muted">
            <span>{{ dayShort(r.date) }}</span>
            <select v-model="r.cat" class="impcat" aria-label="Catégorie">
              <option v-for="c in cats(r.type)" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </div>
      </div>
      <button class="primary" data-a="imsave" style="margin-top: 14px" @click="save">
        Ajouter {{ sel.length }} opération{{ sel.length > 1 ? 's' : '' }} ·
        {{ money(sum(sel, r => Math.abs(r.amount))) }}
      </button>
    </template>
    <details v-if="known.length" class="impknown">
      <summary class="small muted">Voir les {{ known.length }} opérations déjà connues</summary>
      <div v-for="(r, i) in known" :key="i" class="row small" style="padding: 5px 0">
        <span>
          {{ dayShort(r.date) }} · {{ r.clean }}
          <span class="muted">({{ r.why }})</span>
        </span>
        <span class="num">{{ money(r.amount) }}</span>
      </div>
    </details>
  </template>
</template>
