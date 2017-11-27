<template lang="pug">
  div
    canvas#board
    span#spacer
    canvas#preview

    label Cleared: {{ game.stats.linesCleared }}
    label Placed: {{ game.stats.blocksPlaced }}
    // Don't update this every frame, save cpu!
    label Time: {{ (game.ticks * 16 / 1000).toFixed(2)}}

    button(v-on:click='restart()') Restart
</template>

<script lang="ts">
import Vue from "vue";
import { Game, Configuration } from "../tetris/game";

export default Vue.extend({
  methods: {
    startGame() {
      this.game.attachCanvas("board", "preview");
      this.startTime = new Date();
      this.game.loop();
    },
    restart() {
      this.game = new Game();
      this.startGame();
    }
  },
  computed: {
    currentTime() {
      // let game = this.game;
      // return (game.ticks * 16 / 1000).toFixed(2);
      return "sample";
    }
  },
  data() {
    let game = new Game();
    return {
      // NOTE: We don't need to watch the game explicitly and shouldn't
      game: game,
      startTime: new Date()
    };
  },
  mounted() {
    this.startGame();
  }
});
</script>

<style scoped lang="sass">
  #spacer
    padding-right: 10px

  #board
    height: 400px
    width: 200px

  #preview
    height: 400px
    width: 120px
</style>