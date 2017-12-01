import "./style/normalize.css"
import "./style/skeleton.css"
import "./style/vuetris.css"

import Vue from "vue"
import GameComponent from "./components/Game.vue"
import GameConfigComponent from "./components/GameConfig.vue"

import * as OfflinePluginRuntime from "offline-plugin/runtime"
OfflinePluginRuntime.install()

const v = new Vue({
  el: "#app",
  template: `
    <div class="container">
      <div class="row">
        <div class="two-thirds column">
          <game-component />
        </div>
        <div class="one-third column">
          <game-config-component />
        </div>
      </div>
    </div>`,
  components: {
    GameComponent,
    GameConfigComponent,
  },
});
