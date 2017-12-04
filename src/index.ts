import "./style/normalize.css"
import "./style/skeleton.css"
import "./style/vuetris.css"

import Vue from "vue"
import ConfigComponent from "./components/Config.vue"
import GameComponent from "./components/Game.vue"
import ReplayComponent from "./components/Replay.vue"

import * as OfflinePluginRuntime from "offline-plugin/runtime"
OfflinePluginRuntime.install()

const v = new Vue({
  el: "#app",
  template: `
    <div class="wrapper">
      <div id="field">
        <game-component />
      </div>
      <div id="config">
        <config-component />
      </div>
      <div id="replay">
        <replay-component />
      </div>
    </div>`,
  components: {
    GameComponent,
    ConfigComponent,
    ReplayComponent,
  },
});
