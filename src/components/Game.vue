<template lang="pug">
  div#field
    canvas#hold
    canvas#board
    canvas#preview

    div#settings
      label Cleared: {{ game.stats.linesCleared }}
      label Placed: {{ game.stats.blocksPlaced }}
      label TPS: {{ currentTime() != 0 ? (game.stats.blocksPlaced / currentTime()).toFixed(2) : 0 }}
      label KPT: {{ game.stats.blocksPlaced != 0 ? (game.stats.keysPressed / game.stats.blocksPlaced).toFixed(2) : 0 }}
      // Don't update this every frame, save cpu!
      label Time: {{ currentTime() }}
      label Render FPS: {{ game.rtFpsRender.toFixed(3) }}
      label Update FPS: {{ game.rtFpsUpdate.toFixed(3) }}

    div#actions
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
    currentTime() {
      return (this.game.ticks * (1000 / this.game.fps) / 1000).toFixed(2);
    },
    restart() {
      this.game = new Game(Configuration.fromLocalStorage());
      this.startGame();
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

<style lang="sass" scoped>
  #field
    display: grid
    grid-tempate-columns: repeat(42, 1fr)
    grid-row-gap: 10px
    grid-auto-rows: auto

  #hold
    // 100x80
    grid-column: 1 / 10
    grid-row: 1

  #board
    // 200x400
    grid-column: 10 / 30
    grid-row: 1

  #preview
    // 120x400
    grid-column: 30 / 42
    grid-row: 1

  #settings
    grid-column: 10
    grid-row: 2

  #actions
    grid-column: 30
    grid-row: 2
</style>