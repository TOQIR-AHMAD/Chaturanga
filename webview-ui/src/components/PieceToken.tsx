import clsx from "clsx";

import { pieceImages } from "../assets/pieces";
import type { PieceSetId } from "../types";

export function PieceToken({
  piece,
  dragging = false,
  flipped = false
}: {
  piece: string;
  pieceSet?: PieceSetId;
  dragging?: boolean;
  flipped?: boolean;
}) {
  const src = pieceImages[piece];
  if (!src) {
    return null;
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={clsx(
        "pointer-events-none h-[86%] w-[86%] select-none object-contain transition-transform duration-150 drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]",
        flipped && "rotate-180",
        dragging && "scale-105 opacity-80"
      )}
    />
  );
}
