import { Game, GameState, Piece } from "./game"
import { PieceColors, PieceMap, PieceOffsets, Pieces } from "./types"

export function render2d(game: Game) {
  const ctx = game.canvas as CanvasRenderingContext2D
  const ctxPreview = game.previewCanvas as CanvasRenderingContext2D
  const ctxHold = game.holdCanvas as CanvasRenderingContext2D

  const bw = game.canvasA.width / 10
  const bh = game.canvasA.height / 20

  // Render the entire board
  for (let y = 0; y < 20; ++y) {
    for (let x = 0; x < 10; ++x) {
      // Render the specific square, each is 20x20 right now
      if (game.board[y][x] !== 0) {
        const strPiece = Pieces[game.board[y][x] - 1]
        ctx.fillStyle = PieceColors[strPiece]
      } else {
        ctx.fillStyle = 'black'
      }

      ctx.fillRect(x * bw, y * bh, bw, bh)
    }
  }

  // Render the current piece
  // TODO: Use an enumeration of sorts instead of a string?
  if (game.piece !== null) {
    const piece = game.piece as Piece

    const current = PieceOffsets[piece.type][piece.r]
    ctx.fillStyle = PieceColors[piece.type]
    for (const block of current) {
      const x = block[0] + piece.x
      const y = block[1] + piece.y

      ctx.fillRect(x * bw, y * bh, bw, bh)
    }

    // Ghost piece
    const floorY = game.getFloorY()
    const previousAlpha = ctx.globalAlpha
    ctx.globalAlpha = 0.5
    ctx.fillStyle = PieceColors[piece.type]
    for (const block of current) {
      const x = block[0] + piece.x
      const y = block[1] + floorY;

      ctx.fillRect(x * bw, y * bh, bw, bh)
    }
    ctx.globalAlpha = previousAlpha
  }

  ctxHold.fillStyle = 'black'
  ctxHold.fillRect(0, 0, game.holdCanvasA.width, game.holdCanvasA.height)

  if (game.holdPiece != null) {
    const hbw = (game.holdCanvasA.width) / 5
    const hbh = (game.holdCanvasA.height) / 5

    const current = PieceOffsets[game.holdPiece][0]
    ctxHold.fillStyle = PieceColors[game.holdPiece]
    for (const block of current) {
      const x = block[0]
      const y = block[1]

      ctxHold.fillRect(x * hbw + hbw / 2, y * hbh + hbh / 2, hbw, hbh)
    }
  }

  // Render the preview pieces.
  ctxPreview.fillStyle = 'black'
  ctxPreview.fillRect(0, 0, game.previewCanvasA.width,
    game.previewCanvasA.height)

  const pbw = game.previewCanvasA.width / 6
  const pbh = game.previewCanvasA.height / 20

  const offsetX = pbw
  let offsetY = pbh

  for (let i = 0; i < game.cfg.previewCount; ++i) {
    // TODO: Not setting up queue correctly on hold?
    const piece = game.previewQueue[i]
    const current = PieceOffsets[piece][0]

    // Draw at offset, check faststack for offsets
    ctxPreview.fillStyle = PieceColors[piece]

    for (const block of current) {
      const x = pbw * block[0] + offsetX;
      const y = pbh * block[1] + offsetY;

      ctxPreview.fillRect(x, y, pbw, pbh)
    }

    offsetY += pbh * 3
  }

  // Draw status
  let text: string | null = null
  switch (game.state) {
    case GameState.Ready:
      text = 'READY'
      break
    case GameState.Go:
      text = 'GO'
      break
    case GameState.Win:
      text = 'EXCELLENT'
      break
    case GameState.Lockout:
      text = 'GAMEOVER'
      break
  }

  if (text != null) {
    const midw = game.canvasA.width / 2
    const midh = game.canvasA.height / 2
    const width = ctx.measureText(text).width

    ctx.fillStyle = 'white'
    ctx.font = '22px monospace'
    ctx.fillText(text, midw - width / 2, midh)
  }
}

export function renderWebGl(game: Game) {
  const ctx = game.canvas as WebGLRenderingContext
  const ctxPreview = game.previewCanvas as WebGLRenderingContext

  // TODO
}
