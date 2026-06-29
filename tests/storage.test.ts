import { describe, expect, test } from "vitest";

import { mergeRecentGames } from "../src/utils/storage";

describe("recent game storage", () => {
  test("moves the latest game to the front and caps the list", () => {
    const seed = Array.from({ length: 12 }).map((_, index) => ({
      id: `game-${index}`,
      name: `Game ${index}`,
      mode: "human",
      pgn: "",
      fen: "",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      result: "*"
    }));
    const merged = mergeRecentGames(seed, seed[8]);
    expect(merged[0].id).toBe("game-8");
    expect(merged).toHaveLength(12);
  });
});
