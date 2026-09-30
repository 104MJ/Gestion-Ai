/**
 * Store des données : charge l'état depuis IndexedDB au démarrage,
 * puis enregistre automatiquement chaque collection modifiée.
 */
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { S, photos, replaceState, baseState } from '../domain/model.js';
import * as store from '../db.js';

export const useData = defineStore('data', () => {
  const ready = ref(false);
  const saveError = ref(false);
  const timers = {};
  const later = (key, fn) => {
    clearTimeout(timers[key]);
    timers[key] = setTimeout(
      () =>
        fn().catch(() => {
          saveError.value = true;
        }),
      250
    );
  };

  async function init() {
    let state = null;
    try {
      state = await store.loadAll();
    } catch (e) {
      /* stockage indisponible : on démarre vide */
    }
    if (!state) {
      // Migration depuis la version sans framework (même adresse) : localStorage « cap-v1 »
      try {
        const old = localStorage.getItem('cap-v1');
        if (old) state = JSON.parse(old);
      } catch (e) {}
    }
    replaceState(state || baseState());
    try {
      Object.assign(photos, await store.loadPhotos());
    } catch (e) {}
    startAutosave();
    if (state) persistAll();
    ready.value = true;
  }

  let stops = [];
  function startAutosave() {
    stops.forEach(s => s());
    stops = [];
    store.TABLES.forEach(t =>
      stops.push(
        watch(
          () => S[t],
          () => later(t, () => store.saveTable(t, S[t] || [])),
          { deep: true }
        )
      )
    );
    stops.push(
      watch(
        () => S.groceries,
        () => later('groceries', () => store.saveGroceries(S.groceries || {})),
        { deep: true }
      )
    );
    stops.push(
      watch(
        () => store.SETTINGS_KEYS.map(k => S[k]),
        () => later('settings', () => store.saveSettings(S)),
        { deep: true }
      )
    );
  }
  function persistAll() {
    later('settings', () => store.saveSettings(S));
    store.TABLES.forEach(t => later(t, () => store.saveTable(t, S[t] || [])));
    later('groceries', () => store.saveGroceries(S.groceries || {}));
  }

  /** Remplace toutes les données (démo, restauration, remise à zéro). */
  async function replaceAll(state, newPhotos = {}) {
    await store.clearAll().catch(() => {});
    Object.keys(photos).forEach(k => delete photos[k]);
    for (const [k, v] of Object.entries(newPhotos)) {
      photos[k] = v;
      await store.savePhoto(k, v).catch(() => {});
    }
    replaceState(state);
    persistAll();
  }
  async function setPhoto(id, data) {
    photos[id] = data;
    await store.savePhoto(id, data).catch(() => {});
  }
  async function removePhoto(id) {
    delete photos[id];
    await store.deletePhoto(id).catch(() => {});
  }

  return { S, photos, ready, saveError, init, replaceAll, setPhoto, removePhoto };
});
