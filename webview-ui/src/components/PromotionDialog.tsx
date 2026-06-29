import { useChessStore } from "../store/chessStore";
import { PieceToken } from "./PieceToken";

const promotions = ["q", "r", "b", "n"] as const;

export function PromotionDialog() {
  const pendingPromotion = useChessStore((state) => state.pendingPromotion);
  const promote = useChessStore((state) => state.promote);
  const cancel = useChessStore((state) => state.cancelPromotion);
  const pieceSet = useChessStore((state) => state.settings.pieceSet);
  const currentTurn = useChessStore((state) =>
    state.cursor % 2 === 0 ? "w" : "b"
  );

  if (!pendingPromotion) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/45 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-3xl border border-white/10 bg-[#2D2A27] p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-white/55">Promotion</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Choose a piece</h3>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {promotions.map((option) => (
            <button
              key={option}
              className="grid place-items-center rounded-2xl bg-white/5 p-3 transition hover:bg-white/10"
              type="button"
              onClick={() => promote(option)}
            >
              <PieceToken
                piece={`${currentTurn}${option}`}
                pieceSet={pieceSet}
              />
            </button>
          ))}
        </div>
        <button
          className="mt-4 w-full rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:bg-white/5"
          type="button"
          onClick={cancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
