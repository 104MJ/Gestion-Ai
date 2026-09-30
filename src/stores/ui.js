/** État de l'interface : feuille ouverte, toast, confirmation, animation du fond. */
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';

export const useUI = defineStore('ui', () => {
  const sheet = shallowRef(null); // { name, props, key }
  const sheetOpen = ref(false);
  function open(name, props = {}) {
    sheet.value = { name, props, key: Date.now() + Math.random() };
    sheetOpen.value = false;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        sheetOpen.value = true;
      })
    );
  }
  function close() {
    sheetOpen.value = false;
    setTimeout(() => {
      if (!sheetOpen.value) sheet.value = null;
    }, 240);
  }

  const toastMsg = ref(null);
  let tt;
  function toast(msg, sub = '') {
    toastMsg.value = { msg, sub, id: Date.now() };
    clearTimeout(tt);
    tt = setTimeout(
      () => {
        toastMsg.value = null;
      },
      sub ? 3400 : 2200
    );
  }

  const dialog = ref(null);
  /** Confirmation intégrée (confirm() natif indisponible dans certains contextes). */
  function ask(msg, ok = 'Confirmer') {
    return new Promise(res => {
      dialog.value = { msg, ok, res };
    });
  }
  function answer(v) {
    const d = dialog.value;
    dialog.value = null;
    d && d.res(v);
  }

  /** Niveau de révélation de départ pour animer la photo après un versement. */
  const revealFrom = ref(null);
  return { sheet, sheetOpen, open, close, toastMsg, toast, dialog, ask, answer, revealFrom };
});
