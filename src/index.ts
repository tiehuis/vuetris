import Vue from "vue"
import GameComponent from "./components/Game.vue"

let v = new Vue({
  el: "#app",
  template: `
    <div>
        <game-component />
    </div>`,
  components: {
    GameComponent
  }
});