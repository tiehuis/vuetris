import { Input, InputExtra, InputState } from "./input"
import { IInputSource, KeyboardSource, ReplaySource } from "./input"
import { BagRandomizer, IRandomizer, SimpleRandomizer } from "./randomizer"
import { render2d, renderWebGl } from "./render"
import { IRotater, SimpleRotater, SRSRotater } from "./rotater"
import { PieceColors, PieceMap, PieceOffsets, Pieces, PieceType } from "./types"

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
  /// Auto repeat rate (ms per block)
  arr: number
  /// Number of blocks to drop (ms per block)
  softDropGravity: number
  /// Start gravity value (ms per block)
  gravity: number
  /// Number of pieces to reached for win
  goal: number
  /// Time until auto-lock (ms)
  lockTimer: number
  /// Type of randomizer to use
  randomizer: "simple" | "bag"
  /// Type of rotater to use
  rotater: "simple" | "srs"

  constructor() {
    this.version = 1
    this.das = 150
    this.previewCount = 4
    this.arr = 0
    this.gravity = 1000
    this.softDropGravity = 0
    this.goal = 40
    this.lockTimer = 500
    this.randomizer = "bag"
    this.rotater = "srs"
  }

  static fromLocalStorage(): Configuration {
    return Configuration.fromString(localStorage.getItem('config') || null)
  }

  static fromString(data: any): Configuration {
    // We need to append new items to ensure we have the methods associated on
    // the configuration available.
    const cfg: any = new Configuration()
    const saved = JSON.parse(data)
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
    localStorage.setItem('config', this.toString())
  }

  toString() {
    return JSON.stringify(this)
  }

  newRandomizer(seed?: number): IRandomizer {
    switch (this.randomizer) {
      case "simple":
        return new SimpleRandomizer(seed)
      case "bag":
        return new BagRandomizer(seed)
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
  /// Total time elapsed
  timeElapsed: number

  constructor() {
    this.blocksPlaced = 0
    this.linesCleared = 0
    this.keysPressed = 0
    this.timeElapsed = 0
  }
}

export class ReplayBuilder {
  lastKeyState: number
  inputs: number[][]

  constructor() {
    this.lastKeyState = -1
    this.inputs = []
  }

  addKeyState(ticks: number, keyState: number) {
    if (keyState === this.lastKeyState) {
      return
    }

    // We us an array to compact the replay size. We should compact it further
    // if we can (integer array compression) since we have a 5Mb limit in
    // localStorage.
    //
    // Can start with a fixed UInt8Array instead and go from there.
    this.inputs.push([ticks, keyState])
    this.lastKeyState = keyState
  }

  // To export, we need the current configuration and this replay state
}

export class Piece {
  /// Type of piece this is
  type: PieceType
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
    this.type = 'I'
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
  previewQueue: PieceType[]

  inputSource: IInputSource

  state: GameState

  // We will not be building a replay if we are in playback
  replayBuilder: ReplayBuilder | null

  rotater: IRotater

  piece: Piece | null
  holdPiece: PieceType | null
  holdAvailable: boolean

  // Configuration
  cfg: Configuration

  // Output statistics
  stats: Statistics

  // Current fps. We currently fix this to 60fps but this should be dynamically
  // calculated every frame to match the rate at which requestAnimationFrame
  // runs.
  //
  // NOTE: Need to consider how the variable fps ticks affects certain things.
  // i.e. DAS charging while a fps drop occurs?
  //
  // TODO: Only will run correctly on a 60hz refresh!
  fps: number
  ticks: number
  ticksAll: number

  // Input state
  input: InputState

  // Has the game finished?
  finished: boolean

  constructor(
    cfg: Configuration = new Configuration(),
    inputSource: IInputSource = new KeyboardSource()) {

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

    this.inputSource = inputSource

    this.previewQueue = []
    this.gravity = this.cfg.gravity

    this.piece = null
    this.holdPiece = null
    this.holdAvailable = true

    // Pass in the keymap here from the configuration.

    // Replay initialization: We need to copy the configuration as well!
    // const item = JSON.parse(localStorage.getItem('replay') as string)
    // this.randomizer = this.cfg.newRandomizer(item.seed)
    // this.inputSource = new ReplaySource(item.inputs)

    this.input = new InputState()

    this.state = GameState.Ready

    this.stats = new Statistics()

    this.replayBuilder = new ReplayBuilder()

    this.ticks = 0
    this.ticksAll = 0
    this.fps = 60

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

  /// Converts a configuration in ms into the required the number of ticks
  /// (floored) that should elapse by the engine.
  msToTicks(n: number) {
    const msPerTick = 1000 / this.fps
    return Math.floor(n / msPerTick)
  }

  /// Converts a ms per block value into the number of fractional blocks that
  /// need to be moved during this frame.
  msPerBlock(n: number) {
    const msPerTick = 1000 / this.fps
    return msPerTick / n
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
    if (this.piece === null) {
      throw new Error('cannot lock a null piece')
    }

    for (const block of PieceOffsets[this.piece.type][this.piece.r]) {
      const x = block[0] + this.piece.ix
      const y = block[1] + this.piece.hardDropY

      this.board[y][x] = PieceMap[this.piece.type]
    }

    this.piece = null
  }

  private nextPiece(): Piece {
    // TODO: Apply IRS/IHS
    this.previewQueue.push(this.randomizer.next())

    const piece = new Piece()
    piece.type = this.previewQueue.shift() as PieceType
    piece.x = this.rotater.EntryX[piece.type]
    piece.y = 0
    piece.r = this.rotater.EntryTheta[piece.type]

    this.holdAvailable = true
    return piece
  }

  private tryHold(): boolean {
    if (this.piece === null) {
      throw new Error('cannot hold a null piece')
    }

    if (this.holdAvailable) {
      if (this.holdPiece == null) {
        this.holdPiece = this.piece.type
        this.piece = this.nextPiece()
      } else {
        const tmp = this.holdPiece
        this.holdPiece = this.piece.type
        this.piece.type = tmp

        this.piece.x = this.rotater.EntryX[this.holdPiece]
        this.piece.y = 0
        this.piece.r = this.rotater.EntryTheta[this.holdPiece]
      }

      this.holdAvailable = false
      return true
    }

    return false
  }

  private saveReplay() {
    if (this.replayBuilder !== null) {
      this.stats.timeElapsed = (this.ticks * 16 / 1000)
      const now = Date.now()

      const replayData = {
        config: JSON.parse(this.cfg.toString()),
        archived: false,
        date: now,
        name: now,
        statistics: JSON.parse(JSON.stringify(this.stats)),
        seed: this.randomizer.prng.seed,
        inputs: this.replayBuilder.inputs,
      }

      // We store each replay in their own key slot
      localStorage.setItem('replay-' + Date.now(),
        JSON.stringify(replayData))
    }
  }

  private update() {
    let instantFrame = false
    const input = this.inputSource.read(this)

    if (this.replayBuilder !== null) {
      this.replayBuilder.addKeyState(this.ticksAll, input.keyState)
    }
    this.stats.keysPressed += input.newKeysCount

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
            if (this.piece == null) {
              throw new Error('null piece should never occur during falling')
            }

            // We must recheck the lock timer since we may have moved from
            // locking to falling and do not want to lock in mid-air.
            const isLocked = this.state === GameState.Locking &&
              this.piece.lockTimer >= this.msToTicks(this.cfg.lockTimer)

            if ((input.extra & InputExtra.HardDrop) || isLocked) {
              instantFrame = true
              this.state = GameState.LineClear
              break
            }

            // TODO: When do we want to apply gravity. Before movement, or
            // after? Possibly make this configurable.

            if (input.extra & InputExtra.Hold) {
              if (this.tryHold()) {
                break
              }
            }

            if (input.rotation) {
              this.rotater.rotate(this, input.rotation);
            }

            let distance = input.movement
            if (distance !== 0) {
              while (distance < 0) {
                if (!this.isCollision(this.piece.type, this.piece.ix - 1,
                  this.piece.iy, this.piece.r)) {
                  this.piece.x -= 1
                  distance += 1
                } else {
                  break
                }
              }

              while (distance > 0) {
                if (!this.isCollision(this.piece.type, this.piece.ix + 1,
                  this.piece.iy, this.piece.r)) {
                  this.piece.x += 1
                  distance -= 1
                } else {
                  break
                }
              }
            }

            // Compute hard drop and cache, this only changes on an actual
            // movement so we don't need to redo this here.
            let y = this.piece.iy
            while (!this.isCollision(this.piece.type, this.piece.ix, y + 1,
              this.piece.r)) {
              y += 1
            }
            this.piece.hardDropY = y

            this.piece.y += input.gravity + this.msPerBlock(this.gravity)
            if (this.piece.y > this.piece.hardDropY) {
              this.piece.y = this.piece.hardDropY
              this.state = GameState.Locking
            } else {
              // Reset lock timer
              this.state = GameState.Falling
            }

            // Check movement and if lock timer should reset if it is allowed

            if (this.state === GameState.Locking) {
              this.piece.lockTimer += 1
            }
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
            if (this.state === GameState.Win) {
              this.saveReplay()
            }
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
    this.ticksAll += 1
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
