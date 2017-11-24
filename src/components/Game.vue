<template lang="pug">
  div
    canvas#board
    canvas#preview
</template>

<script lang="ts">
import Vue from "vue";
import { Game, Configuration } from "../tetris/game";

export default Vue.extend({
  mounted() {
    let game = new Game("board", "preview");
    game.loop();
  }
  // Note: How to pass through game data and be reactive?
});
</script>

<style scoped lang="sass">
  #board
    padding-left: 500px
    
  #preview
    padding-left: 20px
</style>