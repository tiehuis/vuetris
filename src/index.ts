import Vue from "vue"
import GameComponent from "./components/Game.vue"
import GameConfigComponent from "./components/GameConfig.vue"

import * as OfflinePluginRuntime from "offline-plugin/runtime"
OfflinePluginRuntime.install()

// Have a configuration component which models a js entry as input to a
// configuration file.
//
// This is a data object which is then embedded into the game component.
const v = new Vue({
  el: "#app",
  template: `
    <div class="container">
      <div class="row">
        <div class="column column-80">
          <game-component />
        </div>
        <div class="column">
          <game-config-component />
        </div>
      </div>
    </div>`,
  components: {
    GameComponent,
    GameConfigComponent,
  },
});
