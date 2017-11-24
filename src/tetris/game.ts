import * as kd from "keydrown"

import { Pieces, PieceMap, PieceColors } from "./types"
import { Randomizer, BagRandomizer } from "./randomizer"
import { Rotater, SimpleRotater } from "./rotater"

function timestamp() {
  if (window.performance && window.performance.now) {
    return window.performance.now()
  } else {
    return new Date().getTime()
  }
}

// SRS based piece offsets
const offsets: { [s: string]: number[][][] } = {
  'I': [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  'J': [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 0]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[0, 2], [1, 0], [1, 1], [1, 2]],
  ],
  'L': [
    [[0, 1], [1, 1], [2, 0], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [0, 2], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
  'O': [
    [[1, 0], [1, 1], [2, 0], [2, 1]],
    [[1, 0], [1, 1], [2, 0], [2, 1]],
    [[1, 0], [1, 1], [2, 0], [2, 1]],
    [[1, 0], [1, 1], [2, 0], [2, 1]],
  ],
  'S': [
    [[0, 1], [1, 0], [1, 1], [2, 0]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[0, 2], [1, 1], [1, 2], [2, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  'T': [
    [[0, 1], [1, 0], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 1]],
    [[0, 1], [1, 1], [1, 2], [2, 1]],
    [[0, 1], [1, 0], [1, 1], [1, 2]],
  ],
  'Z': [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[1, 1], [1, 2], [2, 0], [2, 1]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [0, 2], [1, 0], [1, 1]],
  ]
}


const enum GameState {
  Ready,
  Go,
  Falling,
  Locking,
  ARE,
}

// Read this from local storage or otherwise
export class Configuration {
  das: number
  previewCount: number

  constructor() {
    this.das = 90
    this.previewCount = 4
  }

  // Serialize to json and deserialize from json to handle these settings
  //
  // Have multiple sub-objects for the different setting types.
}

type RenderingContext = CanvasRenderingContext2D | WebGLRenderingContext

export class Game {
  // Loop timing variables
  frameDt: number
  frameLast: number
  frameStep: number

  // Draw state
  canvas: RenderingContext
  canvasA: HTMLCanvasElement
  previewCanvas: CanvasRenderingContext2D | WebGLRenderingContext
  previewCanvasA: HTMLCanvasElement

  // Game variables
  // NOTE: Uint8Array would be better here.
  board: number[][]   // y, x indexed

  randomizer: Randomizer
  previewQueue: string[]

  rotater: Rotater
  piece: string
  pieceX: number
  pieceY: number
  pieceR: number

  // Configuration
  cfg: Configuration

  // Input state
  downDebounce: boolean
  dasCounter: number
  leftRotateDebounce: boolean
  rightRotateDebounce: boolean

  constructor(canvasId: string, previewCanvasId: string, cfg: Configuration = new Configuration()) {
    this.canvasA = document.getElementById(canvasId) as HTMLCanvasElement
    this.canvas = this.canvasA.getContext("2d") as RenderingContext

    this.previewCanvasA = document.getElementById(previewCanvasId) as HTMLCanvasElement
    this.previewCanvas = this.previewCanvasA.getContext("2d") as RenderingContext

    // 2d initialize array
    this.board = new Array(20);
    for (var y = 0; y < 20; ++y) {
      this.board[y] = new Array(10)
      for (var x = 0; x < 10; ++x) {
        this.board[y][x] = 0
      }
    }

    this.randomizer = new BagRandomizer()
    this.previewQueue = []
    this.rotater = new SimpleRotater()
    this.piece = this.randomizer.next()
    this.pieceX = 5
    this.pieceY = 0
    this.pieceR = 0

    if (cfg) {
      this.cfg = cfg;
    } else {
      this.cfg = new Configuration()
    }

    this.leftRotateDebounce = false
    this.rightRotateDebounce = false
    this.downDebounce = false
    this.dasCounter = 0

    for (let x = 0; x < this.cfg.previewCount; ++x) {
      this.previewQueue.push(this.randomizer.next())
    }
  }

  render2d(ctx: CanvasRenderingContext2D, ctxPreview: CanvasRenderingContext2D) {
    // Render the entire board
    for (let y = 0; y < 20; ++y) {
      for (let x = 0; x < 10; ++x) {
        // Render the specific square, each is 20x20 right now
        if (this.board[y][x] != 0) {
          const strPiece = Pieces[this.board[y][x] - 1]
          ctx.fillStyle = PieceColors[strPiece]
        } else {
          ctx.fillStyle = 'black'
        }

        ctx.fillRect(x * 20, y * 20, 20, 20)
      }
    }

    // Render the current piece
    const current = offsets[this.piece][this.pieceR]
    ctx.fillStyle = PieceColors[this.piece]
    for (var i = 0; i < current.length; ++i) {
      let x = current[i][0] + this.pieceX
      let y = current[i][1] + this.pieceY

      ctx.fillRect(x * 20, y * 20, 20, 20)
    }

    // Ghost piece
    const floorY = this.getFloorY()
    const previousAlpha = ctx.globalAlpha
    ctx.globalAlpha = 0.5
    ctx.fillStyle = PieceColors[this.piece]
    for (var i = 0; i < current.length; ++i) {
      let x = current[i][0] + this.pieceX
      let y = current[i][1] + floorY;

      ctx.fillRect(x * 20, y * 20, 20, 20)
    }
    ctx.globalAlpha = previousAlpha

    // Render the preview pieces.
    ctxPreview.fillStyle = 'black'
    ctxPreview.fillRect(0, 0, this.previewCanvasA.width, this.previewCanvasA.height)

    var offsetX = 20
    var offsetY = 20

    for (var i = 0; i < this.cfg.previewCount; ++i) {
      const piece = this.previewQueue[i]
      const current = offsets[piece][0]

      // Draw at offset, check faststack for offsets
      ctxPreview.fillStyle = PieceColors[piece]

      for (var j = 0; j < current.length; ++j) {
        let x = 20 * current[j][0] + offsetX;
        let y = 20 * current[j][1] + offsetY;

        ctxPreview.fillRect(x, y, 20, 20)
      }

      offsetY += 60
    }
  }

  renderWebGl(ctx: WebGLRenderingContext, ctxPreview: WebGLRenderingContext) {
    // TODO
  }

  render() {
    // TODO: Don't bother passing the canvases explicitly
    if (this.canvas as CanvasRenderingContext2D && this.previewCanvas as CanvasRenderingContext2D) {
      this.render2d(this.canvas as CanvasRenderingContext2D, this.previewCanvas as CanvasRenderingContext2D)
    }
    else if (this.canvas as WebGLRenderingContext && this.previewCanvas as WebGLRenderingContext) {
      this.renderWebGl(this.canvas as WebGLRenderingContext, this.previewCanvas as WebGLRenderingContext)
    }
    else {
      // unreachable
    }
  }

  getFloorY(): number {
    let y = this.pieceY;
    while (!this.isCollision(this.pieceX, y + 1, this.pieceR)) {
      y += 1
    }
    return y
  }

  isOccupied(x: number, y: number): boolean {
    if (x < 0 || x >= 10 || y < 0 || y >= 20) {
      return true;
    }

    return this.board[y][x] != 0
  }

  isCollision(x: number, y: number, r: number): boolean {
    const current = offsets[this.piece][r]
    for (var i = 0; i < current.length; ++i) {
      let nx = current[i][0] + x;
      let ny = current[i][1] + y;
      if (this.isOccupied(nx, ny)) {
        return true;
      }
    }

    return false;
  }

  // NOTE: We could probably use a contigious array here instead.
  clearLines(): number {
    let count = 0

    // NOTE: This method could be improved.
    for (let y = this.board.length - 1; y >= 0; --y) {
      let found = true
      for (let x = 0; x < this.board[y].length; ++x) {
        if (this.board[y][x] == 0) {
          found = false
          break
        }
      }
      if (found) {
        // This row is fill, copy all others down
        for (let yy = y - 1; yy > 0; --yy) {
          // TODO: Do we need the explicit clone?
          // There was an issue with copying the value occasionally
          // which suggests we should.
          this.board[yy + 1] = this.board[yy].slice(0)
        }

        // Zero last row
        for (let x = 0; x < 10; ++x) {
          this.board[0][x] = 0
        }

        count += 1

        // Recheck the just cleared row
        y += 1
      }
    }

    return count
  }

  handleInput() {
    // TODO: Allow rebinding of keys.
    const ld = kd.LEFT.isDown()
    const rd = kd.RIGHT.isDown()
    if (ld || rd) {
      // Das is in milliseconds so convert
      if (this.dasCounter == 1 || this.dasCounter * 16 >= this.cfg.das) {
        if (ld > rd) {
          if (!this.isCollision(this.pieceX - 1, this.pieceY, this.pieceR)) {
            this.pieceX -= 1
          }
        }
        else if (rd > ld) {
          if (!this.isCollision(this.pieceX + 1, this.pieceY, this.pieceR)) {
            this.pieceX += 1
          }
        }
      }
      this.dasCounter += 1
    } else {
      this.dasCounter = 0
    }

    if (kd.DOWN.isDown()) {
      if (!this.isCollision(this.pieceX, this.pieceY + 1, this.pieceR)) {
        this.pieceY += 1
      }
    }

    if (!kd.Z.isDown()) {
      this.leftRotateDebounce = false;
    }
    if (kd.Z.isDown() && !this.leftRotateDebounce) {
      this.rotater.rotate(this, -1);
      this.leftRotateDebounce = true;
    }

    if (!kd.X.isDown()) {
      this.rightRotateDebounce = false;
    }
    if (kd.X.isDown() && !this.rightRotateDebounce) {
      this.rotater.rotate(this, 1);
      this.rightRotateDebounce = true;
    }

    if (!kd.SPACE.isDown()) {
      this.downDebounce = false;
    }
    if (kd.SPACE.isDown() && !this.downDebounce) {
      const floorY = this.getFloorY()
      const current = offsets[this.piece][this.pieceR]
      // Place piece into board and get new piece
      for (var i = 0; i < current.length; ++i) {
        let x = current[i][0] + this.pieceX
        let y = current[i][1] + floorY;

        this.board[y][x] = PieceMap[this.piece]
      }

      this.downDebounce = true

      this.clearLines()

      // Generate a new piece
      this.previewQueue.push(this.randomizer.next())
      this.piece = this.previewQueue.shift() as string
      this.pieceX = 5
      this.pieceY = 0
      this.pieceR = 0

      // TODO: Check entry collision and game over if so
    }
  }

  update() {
    // Update according to current state.
  }

  frame() {
    let now = timestamp()
    this.frameDt += Math.min(1, (now - this.frameLast) / 1000)

    // TODO: Invalidate replays if too many lag reductions.
    // Only running once?
    // while (this.frameDt > this.frameStep) {
    //     this.frameDt -= this.frameStep;
    //     this.update()
    // }

    this.handleInput()
    this.update()
    this.render()
    this.frameLast = now
    requestAnimationFrame(() => this.frame())
  }

  public loop() {
    requestAnimationFrame(() => this.frame())
  }
}