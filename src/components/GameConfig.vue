<template lang="pug">
  div#settings
    fieldset
      label(for='config-das') DAS
      input(v-model='config.das', id='das' type='number')

      label(for='config-preview-count') Preview Count
      input(v-model='config.previewCount', id='previewCount', type='number')

      label(for='config-arr') ARR
      input(v-model='config.arr', id='arr', type='number')

      label(for='config-soft-drop-gravity') Gravity
      input(v-model='config.softDropGravity', id='softDropGravity', type='number')

      label(for='config-lock-timer') Gravity
      input(v-model='config.lockTimer', id='lockTimer', type='number')

      label(for='config-goal') Goal
      input(v-model='config.goal', id='goal', type='number')

      button(v-on:click.once='saveConfig') Save Settings
</template>

<script lang="ts">
import Vue from "vue";
import { Configuration } from "../tetris/game";

export default Vue.extend({
  data() {
    return {
      config: Configuration.fromLocalStorage()
    };
  },
  methods: {
    saveConfig: function(event: any) {
      let form = document.getElementById("settings") as HTMLDivElement;
      let inputs = document.getElementsByTagName("input");

      let config: any = new Configuration();
      for (let i = 0; i < inputs.length; ++i) {
        config[inputs[i].id] = inputs[i].value;
      }

      config.toLocalStorage();
    }
  }
});
</script>

<style scoped lang="sass">
</style>