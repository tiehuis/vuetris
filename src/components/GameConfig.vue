<template lang="pug">
  div
    button(v-on:click='hidden = !hidden') Show Settings
    fieldset#settings(v-bind:class="{ 'is-hidden': hidden }")
      label(for='das') DAS
      input(v-model='config.das', id='das' type='number')

      label(for='previewCount') Preview Count
      input(v-model='config.previewCount', id='previewCount', type='number')

      label(for='arr') ARR
      input(v-model='config.arr', id='arr', type='number')

      label(for='softDropGravity') Soft Drop Gravity
      input(v-model='config.softDropGravity', id='softDropGravity', type='number')

      label(for='gravity') Gravity
      input(v-model='config.gravity', id='gravity', type='number')

      label(for='lockTimer') Lock Timer
      input(v-model='config.lockTimer', id='lockTimer', type='number')

      label(for='goal') Goal
      input(v-model='config.goal', id='goal', type='number')

      label(for='randomizer') Randomizer
      select(v-model='config.randomizer', id='randomizer')
        option(value='bag') Bag Randomizer
        option(value='simple') Simple

      label(for='rotater') Rotation System
      select(v-model='config.rotater', id='rotater')
        option(value='srs') SRS
        option(value='simple') Simple

      br

      button(v-on:click='saveConfig') Save Settings
      button(v-on:click='clearConfig') Clear Saved Configuration
</template>

<script lang="ts">
import Vue from "vue";
import { Configuration } from "../tetris/game";

export default Vue.extend({
  data() {
    return {
      config: Configuration.fromLocalStorage(),
      hidden: true
    };
  },
  methods: {
    saveConfig: function() {
      let form = document.getElementById("settings") as HTMLDivElement;
      let inputs = form.getElementsByTagName("input");
      let selects = form.getElementsByTagName("select");

      let config: any = new Configuration();
      for (let i = 0; i < inputs.length; ++i) {
        switch (inputs[i].type) {
          case "number":
            config[inputs[i].id] = parseInt(inputs[i].value, 10);
            break;
          default:
            config[inputs[i].id] = inputs[i].value;
            break;
        }
      }
      for (let i = 0; i < selects.length; ++i) {
        config[selects[i].id] = selects[i].value;
      }

      config.toLocalStorage();
    },
    clearConfig: function() {
      localStorage.clear();
    }
  }
});
</script>

<style scoped lang="sass">
</style>