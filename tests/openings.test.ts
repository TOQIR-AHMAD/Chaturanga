import { describe, expect, test } from "vitest";

import { detectOpening } from "../webview-ui/src/services/openings";

describe("opening detection", () => {
  test("matches a known opening by SAN prefix", () => {
    const opening = detectOpening(["e4", "e5", "Nf3", "Nc6", "Bb5"]);
    expect(opening?.name).toBe("Ruy Lopez");
  });

  test("returns undefined for custom positions", () => {
    expect(detectOpening(["Na3", "h5"])).toBeUndefined();
  });
});
