import { Chess, type Move, type Square } from "chess.js";

type AnalyzeRequest = {
  type: "analyze";
  requestId: number;
  fen: string;
  depth: number;
  multiPv: number;
  infinite: boolean;
};

type StopRequest = {
  type: "stop";
  requestId: number;
};

type RequestMessage = AnalyzeRequest | StopRequest;

const pieceValues: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0
};

let activeRequestId = 0;

self.onmessage = (event: MessageEvent<RequestMessage>) => {
  const message = event.data;
  if (message.type === "stop") {
    if (message.requestId === activeRequestId) {
      activeRequestId = 0;
    }
    return;
  }

  activeRequestId = message.requestId;
  void analyze(message);
};

async function analyze(request: AnalyzeRequest): Promise<void> {
  const targetDepth = request.infinite ? Math.max(request.depth + 4, 16) : request.depth;

  for (let depth = 1; depth <= targetDepth; depth += 1) {
    if (request.requestId !== activeRequestId) {
      return;
    }

    const chess = new Chess(request.fen);
    const lines = rootSearch(chess, depth, request.multiPv);
    const bestMove = lines[0]?.move;

    postMessage({
      type: "result",
      requestId: request.requestId,
      lines,
      bestMove,
      depth
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function rootSearch(chess: Chess, depth: number, multiPv: number) {
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
