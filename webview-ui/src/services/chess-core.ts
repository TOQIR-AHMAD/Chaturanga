import { Chess, type Color, type Move, type Square } from "chess.js";

import { detectOpening } from "./openings";

export const START_FEN = "start";
export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
export const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

const pieceValues: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0
};

export function createChess(initialFen: string, moves: string[], cursor = moves.length): Chess {
  const chess = initialFen === START_FEN ? new Chess() : new Chess(initialFen);

  moves.slice(0, cursor).forEach((uci) => {
    chess.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: (uci[4] as "q" | "r" | "b" | "n" | undefined) ?? undefined
    });
  });

  return chess;
}

export function moveToUci(move: Pick<Move, "from" | "to" | "promotion">): string {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

export function getLegalTargets(
  initialFen: string,
  moves: string[],
  cursor: number,
  from: string
): string[] {
  const chess = createChess(initialFen, moves, cursor);
  return chess
    .moves({ square: from as Square, verbose: true })
    .map((move) => move.to);
}

export function getHistory(initialFen: string, moves: string[], cursor: number): Move[] {
  return createChess(initialFen, moves, cursor).history({ verbose: true });
}

export function getCapturedPieces(initialFen: string, moves: string[], cursor: number): {
  white: string[];
  black: string[];
} {
  const captured = {
    white: [] as string[],
    black: [] as string[]
  };

  getHistory(initialFen, moves, cursor).forEach((move) => {
    if (move.captured) {
      if (move.color === "w") {
        captured.white.push(move.captured);
      } else {
        captured.black.push(move.captured);
      }
    }
  });

  return captured;
}

export function getStatusText(chess: Chess): string {
  if (chess.isCheckmate()) {
    return chess.turn() === "w" ? "Black wins by checkmate" : "White wins by checkmate";
  }

  if (chess.isStalemate()) {
    return "Draw by stalemate";
  }

  if (chess.isThreefoldRepetition()) {
    return "Draw by repetition";
  }

  if (chess.isInsufficientMaterial()) {
    return "Draw by insufficient material";
  }

  if (chess.isDraw()) {
    return "Draw";
  }

  if (chess.isCheck()) {
    return `${chess.turn() === "w" ? "White" : "Black"} to move, in check`;
  }

  return `${chess.turn() === "w" ? "White" : "Black"} to move`;
}

export function getResult(chess: Chess): string {
  if (chess.isCheckmate()) {
    return chess.turn() === "w" ? "0-1" : "1-0";
  }

  if (
    chess.isStalemate() ||
    chess.isThreefoldRepetition() ||
    chess.isInsufficientMaterial() ||
    chess.isDraw()
  ) {
    return "1/2-1/2";
  }

  return "*";
}

export function importPgn(pgn: string): {
  initialFen: string;
  moves: string[];
  cursor: number;
  fen: string;
} {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const history = chess.history({ verbose: true }).map(moveToUci);
  return {
    initialFen: START_FEN,
    moves: history,
    cursor: history.length,
    fen: chess.fen()
  };
}

export function validateFen(fen: string): boolean {
  try {
    const chess = new Chess();
    chess.load(fen);
    return true;
  } catch {
    return false;
  }
}

export function getBoardMap(fen: string): Record<string, string | null> {
  const board = new Chess(fen).board();
  const squares: Record<string, string | null> = {};

  board.forEach((row, rowIndex) => {
    row.forEach((piece, fileIndex) => {
      const square = `${FILES[fileIndex]}${8 - rowIndex}`;
      squares[square] = piece ? `${piece.color}${piece.type}` : null;
    });
  });

  return squares;
}

export function setPieceAtFen(
  fen: string,
  square: string,
  piece: string | null,
  sideToMove: Color
): string {
  const [placement] = fen.split(" ");
  const rows = placement.split("/").map((row) => expandFenRow(row).split(""));
  const fileIndex = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rankIndex = 8 - Number(square[1]);
  rows[rankIndex][fileIndex] = piece ? fenCharFromPiece(piece) : "1";
  const normalized = rows.map(collapseFenRow).join("/");
  return `${normalized} ${sideToMove} - - 0 1`;
}

export function evaluateMaterial(chess: Chess): number {
  let score = 0;
  chess.board().forEach((row) => {
    row.forEach((piece) => {
      if (!piece) {
        return;
      }

      const value = pieceValues[piece.type];
      score += piece.color === "w" ? value : -value;
    });
  });
  return score;
}

export function getOpeningSummary(initialFen: string, moves: string[], cursor: number) {
  const history = getHistory(initialFen, moves, cursor);
  return detectOpening(history.map((move) => move.san));
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function expandFenRow(row: string): string {
  return row.replace(/[1-8]/g, (digit) => "1".repeat(Number(digit)));
}

function collapseFenRow(row: string[]): string {
  return row
    .join("")
    .replace(/1{1,8}/g, (group) => String(group.length));
}

function fenCharFromPiece(piece: string): string {
  const color = piece[0];
  const type = piece[1];
  return color === "w" ? type.toUpperCase() : type.toLowerCase();
}
