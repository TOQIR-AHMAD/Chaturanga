import type { PuzzleLine } from "../types";

export const puzzles: PuzzleLine[] = [
  {
    id: "puzzle-001",
    rating: 780,
    title: "Mate in One",
    fen: "6k1/5ppp/8/8/8/5Q2/6PP/6K1 w - - 0 1",
    solution: ["f3a8"],
    hint: "Use the queen along the long diagonal."
  },
  {
    id: "puzzle-002",
    rating: 1020,
    title: "Fork the King",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 2 3",
    solution: ["d4d5", "c6b4", "c2c3"],
    hint: "Advance the center pawn to gain time."
  },
  {
    id: "puzzle-003",
    rating: 1310,
    title: "Deflection",
    fen: "3r2k1/5ppp/8/8/8/4Q3/5PPP/3R2K1 w - - 0 1",
    solution: ["e3e8", "d8e8", "d1d8"],
    hint: "Force the rook away before delivering the final blow."
  },
  {
    id: "puzzle-004",
    rating: 1580,
    title: "Back Rank Net",
    fen: "6k1/5ppp/8/8/8/4Q3/5PPP/4R1K1 w - - 0 1",
    solution: ["e3e8", "g8h7", "e1e8"],
    hint: "Coordinate the queen and rook on the e-file."
  }
];
