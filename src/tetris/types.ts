export type PieceType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z'

export const Pieces: PieceType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z']
export const PieceMap: { [s: string]: number } = {
  I: 1,
  J: 2,
  L: 3,
  O: 4,
  S: 5,
  T: 6,
  Z: 7,
}

export const PieceColors: { [s: string]: string } = {
  I: 'red',
  J: 'green',
  L: 'orange',
  O: 'blue',
  S: 'yellow',
  T: 'purple',
  Z: 'pink',
}

/// The base piece offsets are derived from SRS rotation.
///
/// To mimic other piece rotations, this should be done by the appropriate
/// rotater type.
export const PieceOffsets: { [s: string]: number[][][] } = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 0]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[0, 2], [1, 0], [1, 1], [1, 2]],
  ],
  L: [
    [[0, 1], [1, 1], [2, 0], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [0, 2], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
  O: [
    [[1, 0], [1, 1], [2, 0], [2, 1]],
    [[1, 0], [1, 1], [2, 0], [2, 1]],
    [[1, 0], [1, 1], [2, 0], [2, 1]],
    [[1, 0], [1, 1], [2, 0], [2, 1]],
  ],
  S: [
    [[0, 1], [1, 0], [1, 1], [2, 0]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[0, 2], [1, 1], [1, 2], [2, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  T: [
    [[0, 1], [1, 0], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 1]],
    [[0, 1], [1, 1], [1, 2], [2, 1]],
    [[0, 1], [1, 0], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[1, 1], [1, 2], [2, 0], [2, 1]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [0, 2], [1, 0], [1, 1]],
  ],
}
