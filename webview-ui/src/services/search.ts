import { Chess, type Move } from "chess.js";

// Shared negamax search used by both the engine worker and the main-thread
// fallback. Kept intentionally shallow (see DIFFICULTY_DEPTH) so it stays fast.

const pieceValues: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0
};

export type SearchLine = {
  move: string;
  san: string;
  pv: string[];
  score: number;
  depth: number;
};

export function rootSearch(chess: Chess, depth: number, multiPv: number): SearchLine[] {
  const legalMoves = chess.moves({ verbose: true }) as Move[];
  const turnFactor: 1 | -1 = chess.turn() === "w" ? 1 : -1;

  const lines = legalMoves
    .map((move) => {
      const next = new Chess(chess.fen());
      next.move(move);
      const pv = [toUci(move)];
      const score = -negamax(
        next,
        depth - 1,
        -Infinity,
        Infinity,
        turnFactor === 1 ? -1 : 1,
        pv
      );
      return {
        move: toUci(move),
        san: move.san,
        pv,
        score,
        depth
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, multiPv));

  return lines;
}

// Convenience wrapper for callers that just need the best move for a position.
export function searchBestMove(fen: string, depth: number): string | undefined {
  const chess = new Chess(fen);
  if (chess.isGameOver()) {
    return undefined;
  }
  return rootSearch(chess, Math.max(1, depth), 1)[0]?.move;
}

function negamax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  colorFactor: 1 | -1,
  pv: string[]
): number {
  if (depth === 0 || chess.isGameOver()) {
    return colorFactor * evaluate(chess, depth);
  }

  let best = -Infinity;
  let localAlpha = alpha;

  for (const move of chess.moves({ verbose: true }) as Move[]) {
    const next = new Chess(chess.fen());
    next.move(move);
    const nextPv: string[] = [];
    const score = -negamax(next, depth - 1, -beta, -localAlpha, (colorFactor === 1 ? -1 : 1) as 1 | -1, nextPv);

    if (score > best) {
      best = score;
      pv.splice(1, pv.length, ...nextPv);
    }

    localAlpha = Math.max(localAlpha, best);
    if (localAlpha >= beta) {
      break;
    }
  }

  return best;
}

function evaluate(chess: Chess, depth: number): number {
  if (chess.isCheckmate()) {
    return chess.turn() === "w" ? -100000 + depth : 100000 - depth;
  }

  if (chess.isDraw()) {
    return 0;
  }

  let score = 0;
  chess.board().forEach((row) => {
    row.forEach((piece) => {
      if (!piece) {
        return;
      }
      score += piece.color === "w" ? pieceValues[piece.type] : -pieceValues[piece.type];
    });
  });

  return score;
}

function toUci(move: Pick<Move, "from" | "to" | "promotion">): string {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}
