<template lang="pug">
  div
    button(v-on:click='hidden = !hidden') Replays
    ul#replay-list(v-bind:class="{ 'is-hidden': hidden }")
      li(v-for='replay in this.readOverviews()')
        // Link a click event to starting a new replay in the main window
        // Needs to occur at the upper level.
        span {{ replay.name }} @ {{ new Date(replay.date).toLocaleString() }}: {{ replay.statistics.timeElapsed.toFixed(3) }} - {{ replay.statistics.goal }}
</template>

<script lang="ts">
import Vue from "vue";
import { Configuration } from "../tetris/game";

export default Vue.extend({
  data() {
    return {
      hidden: true
    };
  },
  methods: {
    readOverviews: function() {
      let replays = [];
      for (let i = 0; i < localStorage.length; ++i) {
        const key = localStorage.key(i);
        if (key !== null && key.substring(0, 7) == "replay-") {
          const item = localStorage.getItem(key);
          if (item !== null) {
            const replay = JSON.parse(item);
            // TODO: Allow changing key value
            replay.name = key.substring(7);
            replays.push(replay);
          }
        }
      }

      replays.sort((a, b) => (a.date < b.date ? 1 : -1));
      return replays;
    }
  }
});
</script>

<style scoped lang="sass">
</style>