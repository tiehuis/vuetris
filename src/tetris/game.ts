import * as kd from "keydrown"

import { Pieces, PieceMap, PieceColors, PieceOffsets } from "./types"
import { Randomizer, BagRandomizer } from "./randomizer"
import { Rotater, SimpleRotater } from "./rotater"
import { Input, InputState, readInput, InputExtra } from "./input"
import { render2d, renderWebGl } from "./render"

function timestamp() {
  if (window.performance && window.performance.now) {
    return window.performance.now()
  } else {
    return new Date().getTime()
  }
}

const enum GameState {
  Ready,
  Go,
  NewPiece,
  Falling,
  Locking,
  LineClear,
  ARE,
  Lockout,
  Win,
}

// Read this from local storage or otherwise
export class Configuration {
  das: number
  previewCount: number
  arr: number
  gravity: number
  goal: number

  constructor() {
    this.das = 9
    this.previewCount = 4
    this.arr = 10
    this.gravity = 10
    this.goal = 40
  }

  // Serialize to json and deserialize from json to handle these settings
  //
  // Have multiple sub-objects for the different setting types.
}

export class Statistics {
  placed: number

  constructor() {
    this.placed = 0
  }
}

type RenderingContext = CanvasRenderingContext2D | WebGLRenderingContext

export class Game {
  // Loop timing variables
  frameDt: number
  frameLast: number
  frameStep: number

  // Draw state
  canvasName: string
  canvas: RenderingContext
  canvasA: HTMLCanvasElement
  previewCanvasName: string
  previewCanvas: CanvasRenderingContext2D | WebGLRenderingContext
  previewCanvasA: HTMLCanvasElement

  // Game variables
  // NOTE: Uint8Array would be better here.
  board: number[][]   // y, x indexed

  randomizer: Randomizer
  previewQueue: string[]

  state: GameState

  rotater: Rotater
  piece: string
  pieceR: number

  // NOTE: All x, y values are integers since they are commonly used for indexing
  // specific board members. However, pieces have an implied fractional portion
  // at all times. This is the main value used during movement calculation.
  pieceX: number
  pieceY: number
  pieceFloatX: number
  pieceFloatY: number
  hardDropY: number

  // Configuration
  cfg: Configuration

  // Output statistics
  stats: Statistics

  ticks: number
  ticksAll: number

  // Input state
  input: InputState

  lockTimer: number

  // Has the game finished?
  finished: boolean

  constructor(cfg: Configuration = new Configuration()) {
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
    this.piece = 'X'
    this.pieceX = 5
    this.pieceY = 0
    this.hardDropY = 0
    this.pieceR = 0

    this.input = new InputState()

    this.state = GameState.Ready

    if (cfg) {
      this.cfg = cfg;
    } else {
      this.cfg = new Configuration()
    }

    this.stats = new Statistics()

    this.ticks = 0
    this.ticksAll = 0

    this.lockTimer = 0

    this.finished = false

    for (let x = 0; x < this.cfg.previewCount; ++x) {
      this.previewQueue.push(this.randomizer.next())
    }
  }

  public attachCanvas(canvasId: string, previewCanvasId: string) {
    this.canvasName = canvasId
    this.previewCanvasName = previewCanvasId

    this.canvasA = document.getElementById(canvasId) as HTMLCanvasElement
    // We explicitly set this as the canvas is not set correctly on initialization
    // for some reason and we need a pretty specific sizing in order to avoid
    // blurry output for blocks.
    this.canvasA.width = 200
    this.canvasA.height = 400
    this.canvas = this.canvasA.getContext("2d") as RenderingContext

    this.previewCanvasA = document.getElementById(previewCanvasId) as HTMLCanvasElement
    this.previewCanvasA.width = 120
    this.previewCanvasA.height = 400
    this.previewCanvas = this.previewCanvasA.getContext("2d") as RenderingContext

  }
  render() {
    // TODO: Don't bother passing the canvases explicitly
    if (this.canvas as CanvasRenderingContext2D && this.previewCanvas as CanvasRenderingContext2D) {
      render2d(this)
    }
    else if (this.canvas as WebGLRenderingContext && this.previewCanvas as WebGLRenderingContext) {
      renderWebGl(this)
    }
    else {
      // headless game state
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
    for (let block of PieceOffsets[this.piece][r]) {
      let nx = block[0] + x;
      let ny = block[1] + y;
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

  lockPiece() {
    const floorY = this.getFloorY()
    for (let block of PieceOffsets[this.piece][this.pieceR]) {
      let x = block[0] + this.pieceX
      let y = block[1] + floorY;

      this.board[y][x] = PieceMap[this.piece]
    }
  }

  computeHardDropY() {
    let y = this.pieceY
    while (!this.isCollision(this.pieceX, y, this.pieceR)) {
      y += 1
    }
    this.hardDropY = y - 1
  }

  update() {
    let instantFrame = false
    let input = readInput(this)

    while (true) {
      switch (this.state) {
        case GameState.Ready:
          {
            if (this.ticksAll == 0) {
              console.log('ready')
            }

            if (this.ticksAll++ >= 50) {
              this.state = GameState.Go
            }
          }
          return

        case GameState.Go:
          {
            if (this.ticksAll == 51) {
              console.log('go')
            }

            if (this.ticksAll++ > 100) {
              this.state = GameState.NewPiece
            }
          }
          return

        case GameState.NewPiece:
          {
            // TODO: Apply IRS/IHS

            // Generate a new piece
            this.previewQueue.push(this.randomizer.next())
            this.piece = this.previewQueue.shift() as string
            this.pieceX = 5
            this.pieceY = 0
            this.pieceR = 0

            this.pieceFloatX = this.pieceX
            this.pieceFloatY = this.pieceY

            if (this.isCollision(this.pieceX, this.pieceY, this.pieceR)) {
              this.state = GameState.Lockout
            } else {
              this.state = GameState.Falling
            }
          }
          break

        case GameState.Falling:
        case GameState.Locking:
          {
            // We must recheck the lock timer since we may have moved from locking
            // to falling and do not want to lock in mid-air.
            const isLocked = this.state == GameState.Locking
            if ((input.extra & InputExtra.HardDrop) || isLocked) {
              console.log('encountered hard drop')
              instantFrame = true
              this.state = GameState.LineClear
              break
            }

            // TODO: When do we want to apply gravity. Before movement, or after?
            // Possibly make this configurable.

            if (input.extra & InputExtra.Hold) {
              console.log('performing a hold')
            }

            if (input.rotation) {
              this.rotater.rotate(this, input.rotation);
            }

            let distance = input.movement
            if (distance != 0) {
              while (distance < 0) {
                if (!this.isCollision(this.pieceX - 1, this.pieceY, this.pieceR)) {
                  this.pieceX -= 1
                  distance += 1
                } else {
                  break
                }
              }

              while (distance > 0) {
                if (!this.isCollision(this.pieceX + 1, this.pieceY, this.pieceR)) {
                  this.pieceX += 1
                  distance -= 1
                } else {
                  break
                }
              }
            }

            this.computeHardDropY()
            this.pieceY += input.gravity
            if (this.pieceY > this.hardDropY) {
              this.pieceY = this.hardDropY
            }

            // Check movement and if the lock timer should reset if it is allowed

            if (this.state == GameState.Locking) {
              this.lockTimer += 1
            }
          }
          break

        case GameState.LineClear:
          {
            console.log('clearing line')

            this.lockPiece()
            this.stats.placed += this.clearLines()
            instantFrame = true

            if (this.stats.placed < this.cfg.goal) {
              this.state = GameState.ARE
            } else {
              // TODO: On finish the next piece is still being drawn!
              this.state = GameState.Win
            }
          }
          break

        case GameState.ARE:
          {
            // Wait for certain fixed typed before spawning piece. Any action
            // will cause ARE to be skipped if available.
            instantFrame = true
            this.state = GameState.NewPiece
          }
          break

        case GameState.Lockout:
        case GameState.Win:
          {
            // Signal the game has ended, stop updating
            this.finished = true
          }
          break
      }

      if (instantFrame) {
        instantFrame = false
        continue
      } else {
        break
      }
    }

    this.ticks += 1
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

    this.update()
    this.render()
    this.frameLast = now

    if (!this.finished) {
      requestAnimationFrame(() => this.frame())
    }
  }

  public loop() {
    requestAnimationFrame(() => this.frame())
  }
}