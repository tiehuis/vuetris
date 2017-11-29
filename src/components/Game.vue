<template lang="pug">
  div
    div
      canvas#hold
      span#spacer
      canvas#board
      span#spacer
      canvas#preview

    label Cleared: {{ game.stats.linesCleared }}
    label Placed: {{ game.stats.blocksPlaced }}
    label TPS: {{ currentTime() != 0 ? (game.stats.blocksPlaced / currentTime()).toFixed(2) : 0 }}
    label KPT: {{ game.stats.blocksPlaced != 0 ? (game.stats.keysPressed / game.stats.blocksPlaced).toFixed(2) : 0 }}
    // Don't update this every frame, save cpu!
    label Time: {{ currentTime() }}

    button(v-on:click='restart()') Restart
</template>

<script lang="ts">
import Vue from "vue";
import { Game, Configuration } from "../tetris/game";

export default Vue.extend({
  methods: {
    startGame() {
      this.game.attachCanvas("board", "preview", "hold");
      this.startTime = new Date();
      this.game.loop();
    },
    restart() {
      // TODO: Restart with a non-empty board has soft-drop issues
      this.game = new Game(Configuration.fromLocalStorage());
      this.startGame();
    },
    currentTime() {
      return (this.game.ticks * 16 / 1000).toFixed(2);
    }
  },
  data() {
    let game = new Game(Configuration.fromLocalStorage());
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

  #hold
    height: 100px
    width: 100px

  #board
    height: 400px
    width: 200px

  #preview
    height: 400px
    width: 120px
</style>