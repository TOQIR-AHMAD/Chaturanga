import { useDrop, useDrag } from "react-dnd";

import { FILES, RANKS, createChess, getBoardMap } from "../services/chess-core";
import { useChessStore } from "../store/chessStore";
import { PieceToken } from "./PieceToken";

const dragType = "piece";

function DraggablePiece({
  piece,
  square
}: {
  piece: string;
  square: string;
}) {
  const pieceSet = useChessStore((state) => state.settings.pieceSet);
  const orientation = useChessStore((state) => state.orientation);
  // Flip only the far-side pawns so they point in their moving direction.
  const topColor = orientation === "white" ? "b" : "w";
  const flipped = piece[1] === "p" && piece[0] === topColor;
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: dragType,
      item: {
        square,
        piece
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging()
      })
    }),
    [square, piece]
  );

  return (
    <button
      ref={dragRef}
      className="grid h-full w-full place-items-center"
      tabIndex={-1}
      type="button"
    >
      <PieceToken piece={piece} pieceSet={pieceSet} dragging={isDragging} flipped={flipped} />
    </button>
  );
}

export function ChessBoard() {
  const state = useChessStore();
  const theme = state.settings.theme;
  const activeChess = createChess(state.initialFen, state.moves, state.cursor);
  const currentFen = activeChess.fen();
  const boardMap = getBoardMap(currentFen);
  const orientation = state.orientation;
  const ranks = orientation === "white" ? RANKS : [...RANKS].reverse();
  const files = orientation === "white" ? FILES : [...FILES].reverse();
  const history = activeChess.history({
    verbose: true
  });
  const lastMove = history.at(-1);
  const checkSquare = activeChess.isCheck()
    ? Object.entries(boardMap).find(([square, piece]) => {
        if (!piece) {
          return false;
        }
        const side = piece[0] === "w" ? "w" : "b";
        return piece[1] === "k" && side === activeChess.turn();
      })?.[0]
    : null;

  return (
    <div
      className="board-frame relative rounded-[28px] border border-black/25 p-3 shadow-board"
      style={{
        background:
          theme === "classic"
            ? "linear-gradient(160deg, rgba(255,255,255,0.07), rgba(0,0,0,0.28)), #312E2B"
            : undefined
      }}
    >
      <div className="grid grid-cols-8 overflow-hidden rounded-[20px] border border-black/30">
        {ranks.flatMap((rank) =>
          files.map((file, index) => {
            const square = `${file}${rank}`;
            const piece = boardMap[square];
            const isLight = (FILES.indexOf(file) + Number(rank)) % 2 === 0;
            const isSelected = state.selectedSquare === square;
            const isTarget = state.legalTargets.includes(square);
            const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
            const isCheck = checkSquare === square;

            return (
              <SquareCell
                key={square}
                square={square}
                piece={piece}
                isLight={isLight}
                showRank={state.settings.showCoordinates && index % 8 === 0}
                showFile={state.settings.showCoordinates && rank === (orientation === "white" ? "1" : "8")}
                isSelected={isSelected}
                isTarget={isTarget}
                isLastMove={Boolean(isLastMove)}
                isCheck={Boolean(isCheck)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function SquareCell({
  square,
  piece,
  isLight,
  showRank,
  showFile,
  isSelected,
  isTarget,
  isLastMove,
  isCheck
}: {
  square: string;
  piece: string | null;
  isLight: boolean;
  showRank: boolean;
  showFile: boolean;
  isSelected: boolean;
  isTarget: boolean;
  isLastMove: boolean;
  isCheck: boolean;
}) {
  const selectSquare = useChessStore((state) => state.selectSquare);
  const theme = useChessStore((state) => state.settings.theme);
  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: dragType,
      drop: (item: { square: string }) => {
        if (item.square !== square) {
          selectSquare(item.square);
          selectSquare(square);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver()
      })
    }),
    [square]
  );

  const colors =
    theme === "classic"
      ? {
          light: "#F0D9B5",
          dark: "#B58863"
        }
      : theme === "green"
        ? { light: "#f4f6e2", dark: "#66804f" }
        : theme === "blue"
          ? { light: "#dfe9f3", dark: "#5f7c96" }
          : theme === "dark"
            ? { light: "#c4bcb2", dark: "#51473f" }
            : { light: "#e6dbff", dark: "#66509c" };

  return (
    <button
      ref={dropRef}
      type="button"
      className="group relative aspect-square w-full"
      style={{
        backgroundColor: isLight ? colors.light : colors.dark
      }}
      onClick={() => selectSquare(square)}
      aria-label={square}
    >
      {showRank ? (
        <span className="pointer-events-none absolute left-1 top-1 text-[10px] font-semibold text-black/55">
          {square[1]}
        </span>
      ) : null}
      {showFile ? (
        <span className="pointer-events-none absolute bottom-1 right-1 text-[10px] font-semibold text-black/55">
          {square[0]}
        </span>
      ) : null}
      {isLastMove ? (
        <span className="pointer-events-none absolute inset-0 bg-yellow-300/30" />
      ) : null}
      {isSelected ? (
        <span className="pointer-events-none absolute inset-0 ring-4 ring-inset ring-[#81B64C]" />
      ) : null}
      {isCheck ? (
        <span className="pointer-events-none absolute inset-0 bg-rose-500/35" />
      ) : null}
      {isTarget ? (
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="h-4 w-4 rounded-full bg-black/30" />
        </span>
      ) : null}
      {isOver ? (
        <span className="pointer-events-none absolute inset-0 bg-white/15" />
      ) : null}
      {piece ? <DraggablePiece piece={piece} square={square} /> : null}
    </button>
  );
}
