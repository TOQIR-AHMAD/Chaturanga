import { describe, expect, test } from "vitest";

import {
  START_FEN,
  createChess,
  getLegalTargets,
  importPgn,
  validateFen
} from "../webview-ui/src/services/chess-core";

describe("chess core helpers", () => {
  test("replays UCI moves into a final position", () => {
    const chess = createChess(START_FEN, ["e2e4", "e7e5", "g1f3"]);
    expect(chess.fen()).toContain("rnbqkbnr/pppp1ppp");
  });

  test("finds legal targets for a selected piece", () => {
    const targets = getLegalTargets(START_FEN, [], 0, "e2");
    expect(targets).toEqual(expect.arrayContaining(["e3", "e4"]));
  });

  test("imports PGN into move history", () => {
    const parsed = importPgn("1. e4 e5 2. Nf3 Nc6 3. Bb5 a6");
    expect(parsed.moves).toEqual(["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6"]);
  });

  test("validates FEN input", () => {
    expect(validateFen("4k3/8/8/8/8/8/8/4K3 w - - 0 1")).toBe(true);
    expect(validateFen("not-a-fen")).toBe(false);
  });
});
