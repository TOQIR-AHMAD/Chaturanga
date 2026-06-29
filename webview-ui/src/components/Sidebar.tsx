import { puzzles } from "../services/puzzles";
import { selectDerivedState, useChessStore } from "../store/chessStore";

const editorPieces = [
  "wk",
  "wq",
  "wr",
  "wb",
  "wn",
  "wp",
  "bk",
  "bq",
  "br",
  "bb",
  "bn",
  "bp"
];

export function Sidebar() {
  const state = useChessStore();
  const derived = selectDerivedState(state);
  const updateSettings = useChessStore((store) => store.updateSettings);
  const saveCurrentGame = useChessStore((store) => store.saveCurrentGame);
  const newGame = useChessStore((store) => store.newGame);
  const setView = useChessStore((store) => store.setView);
  const setEditorPiece = useChessStore((store) => store.setEditorPiece);
  const toggleEditMode = useChessStore((store) => store.toggleEditMode);
  const setAnalysisSideToMove = useChessStore((store) => store.setAnalysisSideToMove);
  const setComputerPreferences = useChessStore((store) => store.setComputerPreferences);
  const nextPuzzle = useChessStore((store) => store.nextPuzzle);
  const resetPuzzle = useChessStore((store) => store.resetPuzzle);

  return (
    <aside className="flex h-full flex-col gap-4 rounded-[28px] bg-[#312E2B] p-4 text-white shadow-board">
      <section className="rounded-3xl bg-black/10 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-white/50">Game</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="pill" type="button" onClick={() => newGame("human")}>
            Human vs Human
          </button>
          <button className="pill" type="button" onClick={() => newGame("computer")}>
            Human vs Computer
          </button>
          <button className="pill" type="button" onClick={() => newGame("analysis")}>
            Analysis
          </button>
          <button className="pill" type="button" onClick={resetPuzzle}>
            Puzzles
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

      <section className="rounded-3xl bg-black/10 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-white/50">Opening</p>
        <h3 className="mt-2 text-lg font-semibold">
          {derived.opening?.name ?? "Custom Position"}
        </h3>
        <p className="mt-1 text-sm text-white/70">
          {derived.opening
            ? `${derived.opening.eco} - ${derived.opening.popularity} - ${derived.opening.winRate}`
            : "No book line matched yet."}
        </p>
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
              <option value="beginner">Beginner (400)</option>
              <option value="easy">Easy (800)</option>
              <option value="intermediate">Intermediate (1200)</option>
              <option value="advanced">Advanced (1800)</option>
              <option value="expert">Expert (2400)</option>
              <option value="maximum">Maximum Strength</option>
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

      {state.mode === "analysis" ? (
        <section className="rounded-3xl bg-black/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.18em] text-white/50">Board Editor</p>
            <button className="pill" type="button" onClick={toggleEditMode}>
              {state.editMode ? "Disable" : "Enable"}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-6 gap-2">
            {editorPieces.map((piece) => (
              <button
                key={piece}
                type="button"
                className={`rounded-xl bg-white/5 px-2 py-2 text-lg ${state.editorPiece === piece ? "ring-2 ring-[#81B64C]" : ""}`}
                onClick={() => setEditorPiece(piece)}
              >
                {piece}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span>Side to move</span>
            <button className="pill" type="button" onClick={() => setAnalysisSideToMove("w")}>
              White
            </button>
            <button className="pill" type="button" onClick={() => setAnalysisSideToMove("b")}>
              Black
            </button>
          </div>
        </section>
      ) : null}

      {state.mode === "puzzle" ? (
        <section className="rounded-3xl bg-black/10 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/50">Puzzle Mode</p>
          <h3 className="mt-2 text-lg font-semibold">{puzzles[state.puzzleIndex].title}</h3>
          <p className="mt-1 text-sm text-white/70">
            Rating {puzzles[state.puzzleIndex].rating} - Streak {state.puzzleStreak}
          </p>
          <p className="mt-3 text-sm text-white/80">{puzzles[state.puzzleIndex].hint}</p>
          <div className="mt-4 flex gap-2">
            <button className="pill" type="button" onClick={resetPuzzle}>
              Reset
            </button>
            <button className="pill" type="button" onClick={nextPuzzle}>
              Next
            </button>
          </div>
        </section>
      ) : null}

      <section className="mt-auto rounded-3xl bg-black/10 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-white/50">View</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="pill" type="button" onClick={() => setView("saved")}>
            Saved Games
          </button>
          <button className="pill" type="button" onClick={() => setView("recent")}>
            Recent Games
          </button>
          <button className="pill" type="button" onClick={() => setView("settings")}>
            Settings
          </button>
          <button
            className="pill"
            type="button"
            onClick={() =>
              updateSettings({ showEvaluationBar: !state.settings.showEvaluationBar })
            }
          >
            Eval Bar
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
