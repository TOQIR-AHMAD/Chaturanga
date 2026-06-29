import clsx from "clsx";

import type { PieceSetId } from "../types";

// Use the solid figures for both colors and distinguish sides by fill color,
// so white and black pieces read clearly on any board theme.
const glyphs: Record<string, string> = {
  wp: "♟",
  wn: "♞",
  wb: "♝",
  wr: "♜",
  wq: "♛",
  wk: "♚",
  bp: "♟",
  bn: "♞",
  bb: "♝",
  br: "♜",
  bq: "♛",
  bk: "♚"
};

const setStyles: Record<PieceSetId, string> = {
  classic: "font-serif",
  neo: "font-ui tracking-tight drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]",
  alpha: "font-ui font-bold",
  wood: "font-serif text-amber-100 [text-shadow:0_1px_0_#4b2e14,0_5px_12px_rgba(0,0,0,0.35)]"
};

export function PieceToken({
  piece,
  pieceSet,
  dragging = false
}: {
  piece: string;
  pieceSet: PieceSetId;
  dragging?: boolean;
}) {
  const isWhite = piece.startsWith("w");

  return (
    <span
      className={clsx(
        "pointer-events-none select-none text-[2.4rem] leading-none transition-transform duration-150 md:text-[3rem]",
        setStyles[pieceSet],
        isWhite
          ? "text-white [text-shadow:0_0_1px_#000,0_1px_2px_rgba(0,0,0,0.6)]"
          : "text-[#1a1a1a] [text-shadow:0_0_1px_rgba(255,255,255,0.5)]",
        dragging && "scale-105 opacity-80"
      )}
      aria-hidden="true"
    >
      {glyphs[piece]}
    </span>
  );
}
