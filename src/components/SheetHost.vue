<script setup>
import { useUI } from '../stores/ui.js';
import * as sheets from '../sheets/index.js';
const ui = useUI();
</script>
<template>
  <div class="sheet" :class="{ open: ui.sheetOpen, hidden: !ui.sheet }" @click.self="ui.close()">
    <div class="panel" id="panel">
      <component
        v-if="ui.sheet"
        :is="sheets[ui.sheet.name]"
        :key="ui.sheet.key"
        v-bind="ui.sheet.props"
      />
    </div>
  </div>
</template>
