import { Game, Piece } from "./game"
import { PieceMap } from "./types"

export interface IRotater {
  /// Initial entry rotation
  EntryTheta: { [s: string]: number }
  /// Initial entry x position
  EntryX: { [s: string]: number }
  // Attempt to rotate the games current piece by the specified amount.
  // Return whether the rotation was sucessful.
  rotate(state: Game, rotation: number): boolean
}

// Straight-forward no wallkick rotation
export class SimpleRotater implements IRotater {
  EntryTheta = {
    I: 0, J: 0, L: 0, O: 0, S: 0, T: 0, Z: 0,
  }

  EntryX = {
    I: 3, J: 3, L: 3, O: 3, S: 3, T: 3, Z: 3,
  }

  rotate(state: Game, rotation: number): boolean {
    const piece = state.piece as Piece

    const newR = (piece.r + rotation + 4) % 4;
    if (!state.isCollision(piece.type, piece.ix, piece.iy, newR)) {
      piece.r = newR
      return true
    } else {
      return false
    }
  }
}

const emptyWallkick = [
  [[0, 0]],
  [[0, 0]],
  [[0, 0]],
  [[0, 0]],
]

export class SRSRotater implements IRotater {
  EntryTheta = {
    I: 0, J: 0, L: 0, O: 0, S: 0, T: 0, Z: 0,
  }

  EntryX = {
    I: 3, J: 3, L: 3, O: 3, S: 3, T: 3, Z: 3,
  }

  static kicksR = [1, 0, 0, -1, 0, 0, 0]
  static kicksL = [3, 2, 2, -1, 2, 2, 2]

  static kicks: number[][][][] = [
    // 0: JLSTZ clockwise
    [
      [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], // 0 -> R
      [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], // R -> 2
      [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], // 2 -> L
      [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],  // L -> 0
    ],

    // 1: I clockwise
    [
      [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]], // 0 -> R
      [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]], // R -> 2
      [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]], // 2 -> L
      [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],  // L -> 0
    ],

    // 2: JLSTZ anticlockwise
    [
      [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], // 0 -> L
      [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], // R -> 0
      [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], // 2 -> R
      [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],  // L -> 2
    ],

    // 3: I anticlockwise
    [
      [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]], // 0 -> L
      [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]], // R -> 0
      [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]], // 2 -> R
      [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],  // L -> 2
    ],
  ]

  // TODO: Redo the entire rotation handling!
  rotate(state: Game, rotation: number): boolean {
    const piece = state.piece as Piece

    const newRotation = (piece.r + rotation + 4) % 4;
    const pieceIndex = PieceMap[piece.type] - 1

    // Lookup the table for the given rotation
    // Determine which kicks we need
    let kickno = -1
    if (rotation === 1) {
      kickno = SRSRotater.kicksR[pieceIndex]
    } else if (rotation === -1) {
      kickno = SRSRotater.kicksL[pieceIndex]
    }

    // Get the table
    let table: number[][][] = []
    if (kickno === -1) {
      table = emptyWallkick
    } else {
      table = SRSRotater.kicks[kickno]
    }

    for (const ak of table[piece.r]) {
      const kickX = piece.ix + ak[0]
      const kickY = piece.iy + ak[1]

      if (!state.isCollision(piece.type, kickX, kickY, newRotation)) {
        // TODO: Check floorkick
        piece.x = kickX
        piece.y = kickY
        piece.r = newRotation
        return true
      }
    }

    return false
  }
}
