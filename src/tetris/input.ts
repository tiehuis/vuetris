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

  constructor() {
    this.movement = 0
    this.rotation = 0
    this.gravity = 0
    this.extra = 0
    this.newKeysCount = 0
  }
}

// TODO: This should be configurable and passed to the engine.
//
// These should be mappings from the keydrown names to actions.
const KeyMap = [
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

  constructor() {
    this.dasCounter = 0
    this.keystate = 0
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
    if (kd[KeyMap[action]].isDown()) {
      currentKeystate |= (1 << action)
      newKeyCount += 1
    }
  }

  // TODO: newKeystate calculation here is bad
  const newKeystate = currentKeystate & ~game.input.keystate
  game.input.keystate = currentKeystate

  const actions = new Input()
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
  if (isDown(currentKeystate, KeyActionFlag.Left)) {
    actions.extra |= InputExtra.FinesseMove

    if (game.input.dasCounter > 0) {
      game.input.dasCounter = 0
    }

    if (isDown(newKeystate, KeyActionFlag.Left)) {
      actions.movement = -1
    } else if (game.input.dasCounter <= -game.cfg.das) {
      actions.movement = -game.cfg.arr
    }

    game.input.dasCounter -= 1
  } else if (isDown(currentKeystate, KeyActionFlag.Right)) {
    actions.extra |= InputExtra.FinesseMove

    if (game.input.dasCounter < 0) {
      game.input.dasCounter = 0
    }

    if (isDown(newKeystate, KeyActionFlag.Right)) {
      actions.movement = 1
    } else if (game.input.dasCounter >= game.cfg.das) {
      actions.movement = game.cfg.arr
    }

    game.input.dasCounter += 1
  } else {
    game.input.dasCounter = 0
  }

  if (isDown(currentKeystate, KeyActionFlag.Down)) {
    actions.gravity = game.cfg.softDropGravity
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
