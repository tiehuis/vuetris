<template lang="pug">
  form
    fieldset
      label(for='config-das') Das
      input(v-model='config.das', id='config-das' type='number')

      label(for='config-preview-count') Preview Count
      input(v-model='config.previewCount', id='config-preview-count', type='number')
</template>

<script lang="ts">
import Vue from "vue";
import { Configuration } from "../tetris/game";

export default Vue.extend({
  data() {
    return {
      // Load config from cache instead of a new value here!
      config: new Configuration()
    };
  }
});
</script>

<style scoped lang="sass">
</style>