import { useChessStore, selectDerivedState } from "../store/chessStore";

export function MoveHistory() {
  const state = useChessStore();
  const { history } = selectDerivedState(state);
  const jumpTo = useChessStore((store) => store.jumpTo);

  return (
    <div className="rounded-3xl border border-white/10 bg-black/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">
          Move History
        </h3>
        <div className="flex gap-2 text-xs text-white/60">
          <button type="button" onClick={() => jumpTo(0)}>
            |&lt;
          </button>
          <button type="button" onClick={() => jumpTo(Math.max(0, state.cursor - 1))}>
            &lt;
          </button>
          <button
            type="button"
            onClick={() => jumpTo(Math.min(history.length, state.cursor + 1))}
          >
            &gt;
          </button>
          <button type="button" onClick={() => jumpTo(history.length)}>
            &gt;|
          </button>
        </div>
      </div>
      <div className="grid max-h-52 grid-cols-2 gap-2 overflow-auto pr-1 text-sm">
        {Array.from({ length: Math.ceil(history.length / 2) }).map((_, index) => {
          const whiteMove = history[index * 2];
          const blackMove = history[index * 2 + 1];
          return (
            <div
              key={`${whiteMove?.from ?? "move"}-${whiteMove?.to ?? index}`}
              className="contents"
            >
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-left text-white/85 transition hover:bg-white/5"
                onClick={() => jumpTo(index * 2 + 1)}
              >
                <span className="mr-2 text-white/45">{index + 1}.</span>
                {whiteMove?.san}
              </button>
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-left text-white/85 transition hover:bg-white/5"
                onClick={() => jumpTo(index * 2 + 2)}
              >
                {blackMove?.san ?? "..."}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
