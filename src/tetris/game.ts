import * as kd from "keydrown"

import { Input, InputExtra, InputState, readInput } from "./input"
import { BagRandomizer, IRandomizer, SimpleRandomizer } from "./randomizer"
import { render2d, renderWebGl } from "./render"
import { IRotater, SimpleRotater, SRSRotater } from "./rotater"
import { PieceColors, PieceMap, PieceOffsets, Pieces } from "./types"

function timestamp() {
  if (window.performance && window.performance.now) {
    return window.performance.now()
  } else {
    return new Date().getTime()
  }
}

export const enum GameState {
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

export class Configuration {
  /// Configuration version
  version: number
  /// Delayed auto shift (ms)
  das: number
  /// Number of preview blocks to display
  previewCount: number
  /// Auto repeat rate (blocks/ms)
  arr: number
  /// Number of blocks to drop (blocks/ms)
  softDropGravity: number
  /// Number of pieces to reached for win
  goal: number
  /// How many frames a piece can be on the floor until auto-locking occurs
  // TODO: Convert these to ms
  lockTimer: number
  /// Type of randomizer to use
  randomizer: "simple" | "bag"
  /// Type of rotater to use
  rotater: "simple" | "srs"

  constructor() {
    this.version = 1
    this.das = 9
    this.previewCount = 4
    this.arr = 10
    this.softDropGravity = 20
    this.goal = 40
    this.lockTimer = 60
    this.randomizer = "bag"
    this.rotater = "srs"
  }

  static fromLocalStorage(): Configuration {
    // We need to append new items to ensure we have the methods associated on
    // the configuration available.
    const cfg: any = new Configuration()

    const saved = JSON.parse(localStorage.saveData || null)
    if (saved != null) {
      for (const key in saved) {
        if (saved.hasOwnProperty(key)) {
          cfg[key] = saved[key]
        }
      }
    }

    return cfg;
  }

  toLocalStorage() {
    localStorage.saveData = JSON.stringify(this);
  }

  newRandomizer(): IRandomizer {
    switch (this.randomizer) {
      case "simple":
        return new SimpleRandomizer()
      case "bag":
        return new BagRandomizer()
    }
  }

  newRotater(): IRotater {
    switch (this.rotater) {
      case "simple":
        return new SimpleRotater()
      case "srs":
        return new SRSRotater()
    }
  }
}

export class Statistics {
  /// Number of pieces that have been placed
  blocksPlaced: number
  /// Number of lines that have been cleared
  linesCleared: number
  /// Number of keypresses
  keysPressed: number

  constructor() {
    this.blocksPlaced = 0
    this.linesCleared = 0
    this.keysPressed = 0
  }
}

export class Piece {
  /// Type of piece this is
  type: string
  /// X coordinate
  x: number
  /// Y coordinate
  y: number
  /// Rotation value
  r: number
  /// Lock timer (ticks)
  lockTimer: number
  /// Bottom Y hard drop value
  hardDropY: number
  /// Integer portion of the X coordinate
  get ix(): number { return Math.floor(this.x) }
  /// Integer portion of the y coordinate
  get iy(): number { return Math.floor(this.y) }

  constructor() {
    this.type = ''
    this.x = 0
    this.y = 0
    this.r = 0
    this.lockTimer = 0
    this.hardDropY = 0
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
  previewCanvas: RenderingContext
  previewCanvasA: HTMLCanvasElement
  holdCanvasName: string
  holdCanvas: RenderingContext
  holdCanvasA: HTMLCanvasElement

  // Game variables
  // NOTE: Uint8Array would be better here.
  board: number[][]   // y, x indexed
  gravity: number

  randomizer: IRandomizer
  previewQueue: string[]

  state: GameState

  rotater: IRotater

  piece: Piece | null
  holdPiece: string | null
  holdAvailable: boolean

  // Configuration
  cfg: Configuration

  // Output statistics
  stats: Statistics

  ticks: number
  ticksAll: number

  // Input state
  input: InputState

  // Has the game finished?
  finished: boolean

  constructor(cfg: Configuration = new Configuration()) {
    // 2d initialize array
    this.board = new Array(20);
    for (let y = 0; y < 20; ++y) {
      this.board[y] = new Array(10)
      for (let x = 0; x < 10; ++x) {
        this.board[y][x] = 0
      }
    }

    this.cfg = cfg || new Configuration()
    this.randomizer = this.cfg.newRandomizer()
    this.rotater = this.cfg.newRotater()

    this.previewQueue = []
    this.gravity = 0.1

    this.piece = null
    this.holdPiece = null
    this.holdAvailable = true

    this.input = new InputState()

    this.state = GameState.Ready

    this.stats = new Statistics()

    this.ticks = 0
    this.ticksAll = 0

    this.finished = false

    for (let x = 0; x < this.cfg.previewCount; ++x) {
      this.previewQueue.push(this.randomizer.next())
    }
  }

  attachCanvas(canvasId: string, previewCanvasId: string, holdCanvasI: string) {
    this.canvasName = canvasId
    this.previewCanvasName = previewCanvasId
    this.holdCanvasName = holdCanvasI

    this.canvasA = document.getElementById(canvasId) as HTMLCanvasElement
    // We explicitly set this as the canvas is not set correctly on
    // initialization for some reason and we need a pretty specific sizing in
    // order to avoid blurry output for blocks.
    this.canvasA.width = 200
    this.canvasA.height = 400
    this.canvas = this.canvasA.getContext("2d") as RenderingContext

    this.previewCanvasA =
      document.getElementById(previewCanvasId) as HTMLCanvasElement
    this.previewCanvasA.width = 120
    this.previewCanvasA.height = 400
    this.previewCanvas =
      this.previewCanvasA.getContext("2d") as RenderingContext

    this.holdCanvasA =
      document.getElementById(holdCanvasI) as HTMLCanvasElement
    this.holdCanvasA.width = 100
    this.holdCanvasA.height = 80
    this.holdCanvas =
      this.holdCanvasA.getContext("2d") as RenderingContext
  }

  loop() {
    requestAnimationFrame(() => this.frame())
  }

  isCollision(type: string, x: number, y: number, r: number): boolean {
    for (const block of PieceOffsets[type][r]) {
      const nx = block[0] + x;
      const ny = block[1] + y;
      if (this.isOccupied(nx, ny)) {
        return true;
      }
    }

    return false;
  }

  private render() {
    // TODO: Don't bother passing the canvases explicitly
    if (this.canvas as CanvasRenderingContext2D
      && this.previewCanvas as CanvasRenderingContext2D) {
      render2d(this)
    } else if (this.canvas as WebGLRenderingContext
      && this.previewCanvas as WebGLRenderingContext) {
      renderWebGl(this)
    } else {
      // headless game state
    }
  }

  private isOccupied(x: number, y: number): boolean {
    if (x < 0 || x >= 10 || y < 0 || y >= 20) {
      return true;
    }

    return this.board[y][x] !== 0
  }

  // NOTE: We could probably use a contigious array here instead.
  private clearLines(): number {
    let count = 0

    // NOTE: This method could be improved.
    for (let y = this.board.length - 1; y >= 0; --y) {
      let found = true
      for (const block of this.board[y]) {
        if (block === 0) {
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

  private lockPiece() {
    const piece = this.piece as Piece
    for (const block of PieceOffsets[piece.type][piece.r]) {
      const x = block[0] + piece.ix
      const y = block[1] + piece.hardDropY

      this.board[y][x] = PieceMap[piece.type]
    }
  }

  private nextPiece(): Piece {
    // TODO: Apply IRS/IHS
    this.previewQueue.push(this.randomizer.next())

    const piece = new Piece()
    piece.type = this.previewQueue.shift() as string
    piece.x = 5
    piece.y = 0
    piece.r = 0

    this.holdAvailable = true
    return piece
  }

  private tryHold(): boolean {
    const piece = this.piece as Piece

    if (this.holdAvailable) {
      if (this.holdPiece == null) {
        this.holdPiece = piece.type
        this.piece = this.nextPiece()
      } else {
        piece.x = 5
        piece.y = 0
        piece.r = 0

        const tmp = this.holdPiece
        this.holdPiece = piece.type
        piece.type = tmp

        this.piece = piece
      }

      // TODO: Update hard drop
      this.holdAvailable = false
      return true
    }

    return false
  }

  private update() {
    let instantFrame = false
    const input = readInput(this)

    while (true) {
      switch (this.state) {
        case GameState.Ready:
          {
            if (this.ticksAll === 0) {
              // Emit ready
            }

            if (this.ticksAll++ >= 50) {
              this.state = GameState.Go
            }
          }
          return

        case GameState.Go:
          {
            if (this.ticksAll === 51) {
              // Emit go
            }

            if (this.ticksAll++ > 100) {
              this.state = GameState.NewPiece
            }
          }
          return

        case GameState.NewPiece:
          {
            const piece = this.nextPiece()
            if (this.isCollision(piece.type, piece.ix, piece.iy, piece.r)) {
              this.state = GameState.Lockout
            } else {
              this.state = GameState.Falling
            }
            this.piece = piece
          }
          break

        case GameState.Falling:
        case GameState.Locking:
          {
            const piece = this.piece as Piece

            // We must recheck the lock timer since we may have moved from
            // locking to falling and do not want to lock in mid-air.
            const isLocked = this.state === GameState.Locking &&
              piece.lockTimer > this.cfg.lockTimer

            if ((input.extra & InputExtra.HardDrop) || isLocked) {
              instantFrame = true
              this.state = GameState.LineClear
              break
            }

            // TODO: When do we want to apply gravity. Before movement, or
            // after? Possibly make this configurable.

            if (input.extra & InputExtra.Hold) {
              this.tryHold()
            }

            if (input.rotation) {
              this.rotater.rotate(this, input.rotation);
            }

            let distance = input.movement
            if (distance !== 0) {
              while (distance < 0) {
                if (!this.isCollision(piece.type, piece.ix - 1, piece.iy,
                  piece.r)) {
                  piece.x -= 1
                  distance += 1
                } else {
                  break
                }
              }

              while (distance > 0) {
                if (!this.isCollision(piece.type, piece.ix + 1, piece.iy,
                  piece.r)) {
                  piece.x += 1
                  distance -= 1
                } else {
                  break
                }
              }
            }

            // Compute hard drop and cache, this only changes on an actual
            // movement so we don't need to redo this here.
            let y = piece.iy
            while (!this.isCollision(piece.type, piece.ix, y + 1, piece.r)) {
              y += 1
            }
            piece.hardDropY = y

            piece.y += input.gravity + this.gravity
            if (piece.y > piece.hardDropY) {
              piece.y = piece.hardDropY
              this.state = GameState.Locking
            } else {
              // Reset lock timer
              this.state = GameState.Falling
            }

            // Check movement and if lock timer should reset if it is allowed

            if (this.state === GameState.Locking) {
              piece.lockTimer += 1
            }

            this.piece = piece
          }
          break

        case GameState.LineClear:
          {
            this.lockPiece()
            this.stats.blocksPlaced += 1
            this.stats.linesCleared += this.clearLines()
            instantFrame = true

            if (this.stats.linesCleared < this.cfg.goal) {
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

  private frame() {
    const now = timestamp()
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
}
