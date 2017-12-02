import * as kd from "keydrown"

import { Game } from "./game"

export const enum InputExtra {
  HardDrop = 1 << 0,
  Hold = 1 << 1,
  Lock = 1 << 2,
  FinesseMove = 1 << 3,
  FinesseRotate = 1 << 4,
}

export class Input {
  // Left-right movement
  movement: number
  // Rotation amount
  rotation: number
  // Downward movement
  gravity: number
  // Specific extra action
  extra: InputExtra
  // For KPT calculation
  newKeysCount: number
  // Raw keystate
  keyState: number

  constructor() {
    this.movement = 0
    this.rotation = 0
    this.gravity = 0
    this.extra = 0
    this.newKeysCount = 0
    this.keyState = 0
  }
}

// These should be mappings from the keydrown names to actions.
const DefaultKeyMap = [
  'SPACE',
  'DOWN',
  'LEFT',
  'RIGHT',
  'X',
  'Z',
  'A',
  'C',
]

const enum KeyAction {
  Up,
  Down,
  Left,
  Right,
  RotateRight,
  RotateLeft,
  RotateHalf,
  Hold,
}

const KeyActionArray = [
  KeyAction.Up,
  KeyAction.Down,
  KeyAction.Left,
  KeyAction.Right,
  KeyAction.RotateRight,
  KeyAction.RotateLeft,
  KeyAction.RotateHalf,
  KeyAction.Hold,
]

const enum KeyActionFlag {
  Up = 1 << KeyAction.Up,
  Down = 1 << KeyAction.Down,
  Left = 1 << KeyAction.Left,
  Right = 1 << KeyAction.Right,
  RotateRight = 1 << KeyAction.RotateRight,
  RotateLeft = 1 << KeyAction.RotateLeft,
  RotateHalf = 1 << KeyAction.RotateHalf,
  Hold = 1 << KeyAction.Hold,
}

// Input state stores all cross-frame input state that the game must be
// aware of.
export class InputState {
  /// How many frames DAS has been active for
  dasCounter: number
  // Last known keystate. Used for key debouncing.
  keystate: number
  // User-defined keymap
  keyMap: string[]

  constructor(keyMap: string[] = DefaultKeyMap) {
    this.dasCounter = 0
    this.keystate = 0
    this.keyMap = keyMap
  }
}

function isDown(keystate: number, action: KeyActionFlag): boolean {
  return (keystate & action) !== 0
}

export function readInput(game: Game): Input {
  let currentKeystate = 0
  let newKeyCount = 0

  for (const action of KeyActionArray) {
    // Every key is supposedly down?
    if (kd[game.input.keyMap[action]].isDown()) {
      const actionFlag = 1 << action
      currentKeystate |= actionFlag

      if ((game.input.keystate & actionFlag) === 0) {
        newKeyCount += 1
      }
    }
  }

  const newKeystate = currentKeystate & ~game.input.keystate
  game.input.keystate = currentKeystate

  const actions = new Input()
  actions.keyState = currentKeystate
  actions.newKeysCount = newKeyCount

  // How does DAS work?
  //
  // We keep an internal counter which increments each frame tick. When the
  // counter exceeds the DAS level the piece is moved by the ARR level every
  // subsequent frame.
  //
  // DAS is applied during all game states and so charging will be applied in
  // most circumstances by default.
  //
  // We do not preserve DAS across directional movements.
  //
  // TODO: Takes a frame to DAS charge on the current. Trigger on piece entry if
  // we are over the limit as well.
  //
  // TODO: We currently do not prioritize any direction. This gives us the nice
  // feature that a single-tap from a DAS to wall can occur even if the the
  // DAS direction is still held. This feels a bit different to other games and
  // still need to determine if it works best.
  let directional = false
  if (isDown(currentKeystate, KeyActionFlag.Left)) {
    actions.extra |= InputExtra.FinesseMove

    if (game.input.dasCounter > 0) {
      game.input.dasCounter = 0
    }

    if (isDown(newKeystate, KeyActionFlag.Left)) {
      actions.movement = -1
    } else if (game.input.dasCounter <= game.msToTicks(-game.cfg.das)) {
      if (game.cfg.arr === 0) {
        actions.movement = -10
      } else {
        actions.movement = game.msPerBlock(-game.cfg.arr)
      }
    }

    game.input.dasCounter -= 1
    directional = true
  }
  if (isDown(currentKeystate, KeyActionFlag.Right)) {
    actions.extra |= InputExtra.FinesseMove

    if (game.input.dasCounter < 0) {
      game.input.dasCounter = 0
    }

    if (isDown(newKeystate, KeyActionFlag.Right)) {
      actions.movement = 1
    } else if (game.input.dasCounter >= game.msToTicks(game.cfg.das)) {
      if (game.cfg.arr === 0) {
        actions.movement = 10
      } else {
        actions.movement = game.msPerBlock(game.cfg.arr)
      }
    }

    game.input.dasCounter += 1
    directional = true
  }

  if (!directional) {
    game.input.dasCounter = 0
  }

  if (isDown(currentKeystate, KeyActionFlag.Down)) {
    if (game.cfg.softDropGravity === 0) {
      actions.gravity = 20
    } else {
      actions.gravity = game.msPerBlock(game.cfg.softDropGravity)
    }
  }
  if (isDown(newKeystate, KeyActionFlag.Up)) {
    actions.gravity = 20
    actions.extra |= InputExtra.HardDrop
  }

  // All rotation parts are summed if multiple occur in the same frame.
  // TODO: Could we merge rotation and movement finesse on the same frame since
  // technically it isn't a wasted actions?
  if (isDown(newKeystate, KeyActionFlag.RotateRight)) {
    actions.rotation += 1
    actions.extra |= InputExtra.FinesseRotate
  }
  if (isDown(newKeystate, KeyActionFlag.RotateLeft)) {
    actions.rotation -= 1
    actions.extra |= InputExtra.FinesseRotate
  }
  if (isDown(newKeystate, KeyActionFlag.RotateHalf)) {
    actions.rotation += 2
    actions.extra |= InputExtra.FinesseRotate
  }

  if (isDown(newKeystate, KeyActionFlag.Hold)) {
    actions.extra |= InputExtra.Hold
  }

  return actions
}
