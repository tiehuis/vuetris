import { Game } from "./game"
import { PieceMap } from "./types"

export interface Rotater {
  // Attempt to rotate the games current piece by the specified amount.
  // Return whether the rotation was sucessful.
  rotate(state: Game, rotation: number): boolean
}

export class SimpleRotater {
  constructor() { }

  rotate(state: Game, rotation: number): boolean {
    // Straight-forward no wallkick rotation
    const newRotation = (state.pieceR + rotation + 4) % 4;
    if (!state.isCollision(state.pieceX, state.pieceY, newRotation)) {
      state.pieceR = newRotation
      return true
    }
    return false
  }
}

const emptyWallkick = [
  [[0, 0]],
  [[0, 0]],
  [[0, 0]],
  [[0, 0]],
]

export class SRSRotater {
  constructor() { }

  static kicksR = [1, 0, 0, -1, 0, 0, 0]
  static kicksL = [3, 2, 2, -1, 2, 2, 2]

  static kicks: number[][][][] = [
    // 0: JLSTZ clockwise
    [
      [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], // 0 -> R
      [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], // R -> 2
      [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], // 2 -> L
      [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]]  // L -> 0
    ],

    // 1: I clockwise
    [
      [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]], // 0 -> R
      [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]], // R -> 2
      [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]], // 2 -> L
      [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]]  // L -> 0
    ],

    // 2: JLSTZ anticlockwise
    [
      [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], // 0 -> L
      [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], // R -> 0
      [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], // 2 -> R
      [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]]  // L -> 2
    ],

    // 3: I anticlockwise
    [
      [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]], // 0 -> L
      [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]], // R -> 0
      [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]], // 2 -> R
      [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]]  // L -> 2
    ]
  ]

  // TODO: Redo the entire rotation handling!
  rotate(state: Game, rotation: number): boolean {
    const newRotation = (state.pieceR + rotation + 4) % 4;
    const pieceIndex = PieceMap[state.piece]

    // Determine which kicks we need
    let kickno = -1
    if (rotation == 1) {
      kickno = SRSRotater.kicksR[pieceIndex]
    } else if (rotation == -1) {
      kickno = SRSRotater.kicksL[pieceIndex]
    }

    // Get the table
    let table = undefined
    if (kickno == -1) {
      table = emptyWallkick
    } else {
      table = SRSRotater.kicks[kickno]
    }

    for (let i = 0; i < table[state.pieceR].length; ++i) {
      const ak = table[state.pieceR][i]

      const kickX = state.pieceX + ak[0]
      const kickY = state.pieceY + ak[1]

      if (!state.isCollision(kickX, kickY, newRotation)) {
        // TODO: Check floorkick
        state.pieceX = kickX
        state.pieceY = kickY
        state.pieceR = newRotation
        return true
      }
    }

    return false
  }
}