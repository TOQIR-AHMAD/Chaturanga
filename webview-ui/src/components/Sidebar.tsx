import { selectDerivedState, useChessStore } from "../store/chessStore";

export function Sidebar() {
  const state = useChessStore();
  const derived = selectDerivedState(state);
  const saveCurrentGame = useChessStore((store) => store.saveCurrentGame);
  const newGame = useChessStore((store) => store.newGame);
  const setView = useChessStore((store) => store.setView);
  const setComputerPreferences = useChessStore((store) => store.setComputerPreferences);

  return (
    <aside className="flex h-full flex-col gap-4 rounded-[28px] bg-[#312E2B] p-4 text-white shadow-board">
      <section className="rounded-3xl bg-black/10 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-white/50">New Game</p>
        <div className="mt-3 flex flex-col gap-2">
          <button
            className={`pill ${state.mode === "human" ? "ring-2 ring-[#81B64C]" : ""}`}
            type="button"
            onClick={() => newGame("human")}
          >
            Play with a Friend
          </button>
          <button
            className={`pill ${state.mode === "computer" ? "ring-2 ring-[#81B64C]" : ""}`}
            type="button"
            onClick={() => newGame("computer")}
          >
            Play vs Computer
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Meta label="Turn" value={derived.chess.turn() === "w" ? "White" : "Black"} />
          <Meta label="Result" value={derived.result} />
          <Meta label="White" value={derived.clocks.white} />
          <Meta label="Black" value={derived.clocks.black} />
        </div>
        <button
          className="mt-4 button-primary w-full"
          type="button"
          onClick={() => saveCurrentGame()}
        >
          Save Game
        </button>
      </section>

      {state.mode === "computer" ? (
        <section className="rounded-3xl bg-black/10 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/50">Computer</p>
          <label className="mt-3 block text-sm">
            Difficulty
            <select
              className="mt-2 w-full rounded-2xl bg-white/5 px-3 py-2"
              value={state.difficulty}
              onChange={(event) =>
                setComputerPreferences({
                  difficulty: event.target.value as typeof state.difficulty
                })
              }
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className={`pill ${state.computerColor === "b" ? "ring-2 ring-[#81B64C]" : ""}`}
              type="button"
              onClick={() => setComputerPreferences({ computerColor: "b" })}
            >
              Play White
            </button>
            <button
              className={`pill ${state.computerColor === "w" ? "ring-2 ring-[#81B64C]" : ""}`}
              type="button"
              onClick={() => setComputerPreferences({ computerColor: "w" })}
            >
              Play Black
            </button>
            <button className="pill" type="button" onClick={() => newGame("computer")}>
              Rematch
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl bg-black/10 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-white/50">Opening</p>
        <h3 className="mt-2 text-lg font-semibold">
          {derived.opening?.name ?? "Custom Position"}
        </h3>
        <p className="mt-1 text-sm text-white/70">
          {derived.opening
            ? `${derived.opening.eco} · ${derived.opening.popularity}`
            : "No book line matched yet."}
        </p>
      </section>

      <section className="mt-auto rounded-3xl bg-black/10 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-white/50">View</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="pill" type="button" onClick={() => setView("board")}>
            Board
          </button>
          <button className="pill" type="button" onClick={() => setView("saved")}>
            Saved Games
          </button>
          <button className="pill" type="button" onClick={() => setView("recent")}>
            Recent Games
          </button>
          <button className="pill" type="button" onClick={() => setView("settings")}>
            Settings
          </button>
        </div>
      </section>
    </aside>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.15em] text-white/45">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
