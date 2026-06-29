import clsx from "clsx";

import type { PieceSetId } from "../types";

const glyphs: Record<string, string> = {
  wp: "♙",
  wn: "♘",
  wb: "♗",
  wr: "♖",
  wq: "♕",
  wk: "♔",
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
  return (
    <span
      className={clsx(
        "pointer-events-none select-none text-[2.4rem] leading-none transition-transform duration-150 md:text-[3rem]",
        setStyles[pieceSet],
        dragging && "scale-105 opacity-80"
      )}
      aria-hidden="true"
    >
      {glyphs[piece]}
    </span>
  );
}
