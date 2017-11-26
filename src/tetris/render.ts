import { Pieces, PieceMap, PieceColors, PieceOffsets } from "./types"
import { Game } from "./game"

export function render2d(game: Game) {
  let ctx = game.canvas as CanvasRenderingContext2D
  let ctxPreview = game.previewCanvas as CanvasRenderingContext2D

  let bw = game.canvasA.width / 10
  let bh = game.canvasA.height / 20

  // Render the entire board
  for (let y = 0; y < 20; ++y) {
    for (let x = 0; x < 10; ++x) {
      // Render the specific square, each is 20x20 right now
      if (game.board[y][x] != 0) {
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
  if (game.piece != 'X') {
    const current = PieceOffsets[game.piece][game.pieceR]
    ctx.fillStyle = PieceColors[game.piece]
    for (let block of current) {
      let x = block[0] + game.pieceX
      let y = block[1] + game.pieceY

      ctx.fillRect(x * bw, y * bh, bw, bh)
    }

    // Ghost piece
    const floorY = game.getFloorY()
    const previousAlpha = ctx.globalAlpha
    ctx.globalAlpha = 0.5
    ctx.fillStyle = PieceColors[game.piece]
    for (let block of current) {
      let x = block[0] + game.pieceX
      let y = block[1] + floorY;

      ctx.fillRect(x * bw, y * bh, bw, bh)
    }
    ctx.globalAlpha = previousAlpha
  }

  // Render the preview pieces.
  ctxPreview.fillStyle = 'black'
  ctxPreview.fillRect(0, 0, game.previewCanvasA.width, game.previewCanvasA.height)

  let pbw = game.previewCanvasA.width / 6
  let pbh = game.previewCanvasA.height / 20

  var offsetX = pbw
  var offsetY = pbh

  for (var i = 0; i < game.cfg.previewCount; ++i) {
    const piece = game.previewQueue[i]
    const current = PieceOffsets[piece][0]

    // Draw at offset, check faststack for offsets
    ctxPreview.fillStyle = PieceColors[piece]

    for (let block of current) {
      let x = pbw * block[0] + offsetX;
      let y = pbh * block[1] + offsetY;

      ctxPreview.fillRect(x, y, pbw, pbh)
    }

    offsetY += pbh * 3
  }
}

export function renderWebGl(game: Game) {
  let ctx = game.canvas as WebGLRenderingContext
  let ctxPreview = game.previewCanvas as WebGLRenderingContext

  // TODO
}
