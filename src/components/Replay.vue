<template lang="pug">
  div
    button(v-on:click='hidden = !hidden') Replays
    div(v-bind:class="{ 'is-hidden': hidden }")
      ul#replay-list
        li(v-for='replay in this.readOverviews().slice(start, end)')
          // Link a click event to starting a new replay in the main window
          // Needs to occur at the upper level.
          span {{ replay.name }} @ {{ new Date(replay.date).toLocaleString() }}: {{ replay.statistics.timeElapsed.toFixed(3) }} - {{ replay.statistics.goal }}
          span(v-on:click='toggleArchive(replay.id)')
            a(v-if='replay.archived') (Archived)
            a(v-else) (Not Archived)
      label {{ start }} - {{ Math.min(end, replays.length) }} of {{ this.readOverviews().length }}

      button(v-on:click='prevPage()', :disabled='start == 0') Back
      button(v-on:click='nextPage()', :disabled='end >= this.readOverviews().length') Next

      div
        br
        br
        br
        button(v-on:click='deleteReplays()') Delete All
</template>

<script lang="ts">
import Vue from "vue";
import { Configuration } from "../tetris/game";

const pageSize = 10;

export default Vue.extend({
  data() {
    return {
      hidden: true,
      start: 0,
      end: pageSize
    };
  },
  computed: {
    replays: function(): any[] {
      return this.readOverviews();
    }
  },
  methods: {
    readOverviews() {
      let replays = [];
      for (let i = 0; i < localStorage.length; ++i) {
        const key = localStorage.key(i);
        if (key !== null && key.substring(0, 7) == "replay-") {
          const item = localStorage.getItem(key);
          if (item !== null) {
            const replay = JSON.parse(item);
            replay.id = key;
            replays.push(replay);
          }
        }
      }

      replays.sort((a, b) => (a.date < b.date ? 1 : -1));
      return replays;
    },
    nextPage() {
      this.start += pageSize;
      this.end += pageSize;
    },
    prevPage() {
      this.start -= pageSize;
      this.end -= pageSize;

      if (this.start < 0) {
        this.start = 0;
        this.end = pageSize;
      }
    },
    toggleArchive(key: string) {
      const item = localStorage.getItem(key);
      if (item !== null) {
        const replay = JSON.parse(item);
        replay.archived = !replay.archived;
        localStorage.setItem(key, JSON.stringify(replay));
      }
    },
    deleteReplays() {
      for (const replay of this.readOverviews()) {
        if (!replay.archived) {
          localStorage.removeItem(replay.id);
        }
      }
    }
  }
});
</script>

<style scoped lang="sass">
</style>