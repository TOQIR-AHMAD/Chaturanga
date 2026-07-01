import { Chess } from "chess.js";

import { rootSearch } from "../services/search";

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
