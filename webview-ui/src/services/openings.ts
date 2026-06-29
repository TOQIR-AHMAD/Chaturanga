import type { OpeningLine } from "../types";

export const openings: OpeningLine[] = [
  {
    eco: "B20",
    name: "Sicilian Defense",
    sanMoves: ["e4", "c5"],
    popularity: "Very High",
    winRate: "54% White / 46% Black"
  },
  {
    eco: "C00",
    name: "French Defense",
    sanMoves: ["e4", "e6"],
    popularity: "High",
    winRate: "52% White / 48% Black"
  },
  {
    eco: "B10",
    name: "Caro-Kann Defense",
    sanMoves: ["e4", "c6"],
    popularity: "High",
    winRate: "53% White / 47% Black"
  },
  {
    eco: "C60",
    name: "Ruy Lopez",
    sanMoves: ["e4", "e5", "Nf3", "Nc6", "Bb5"],
    popularity: "Very High",
    winRate: "56% White / 44% Black"
  },
  {
    eco: "C50",
    name: "Italian Game",
    sanMoves: ["e4", "e5", "Nf3", "Nc6", "Bc4"],
    popularity: "Very High",
    winRate: "55% White / 45% Black"
  },
  {
    eco: "D06",
    name: "Queen's Gambit",
    sanMoves: ["d4", "d5", "c4"],
    popularity: "Very High",
    winRate: "54% White / 46% Black"
  },
  {
    eco: "A10",
    name: "English Opening",
    sanMoves: ["c4"],
    popularity: "Medium",
    winRate: "53% White / 47% Black"
  },
  {
    eco: "E60",
    name: "King's Indian Defense",
    sanMoves: ["d4", "Nf6", "c4", "g6"],
    popularity: "High",
    winRate: "52% White / 48% Black"
  }
];

export function detectOpening(sanMoves: string[]): OpeningLine | undefined {
  return openings
    .slice()
    .sort((left, right) => right.sanMoves.length - left.sanMoves.length)
    .find((opening) =>
      opening.sanMoves.every((move, index) => sanMoves[index] === move)
    );
}
