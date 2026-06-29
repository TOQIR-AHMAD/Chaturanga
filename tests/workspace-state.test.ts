import { describe, expect, test } from "vitest";

import { serializeWorkspaceState, useChessStore } from "../webview-ui/src/store/chessStore";

describe("workspace serialization", () => {
  test("serializes the current board state", () => {
    const store = useChessStore.getState();
    store.newGame("human");
    store.selectSquare("e2");
    store.selectSquare("e4");

    const payload = serializeWorkspaceState(useChessStore.getState());
    expect(payload.currentState?.moves).toEqual(["e2e4"]);
    expect(payload.currentState?.mode).toBe("human");
  });
});
