import { useChessStore } from "../store/chessStore";

export function Toolbar() {
  const mode = useChessStore((state) => state.mode);
  const difficulty = useChessStore((state) => state.difficulty);
  const newGame = useChessStore((state) => state.newGame);
  const undo = useChessStore((state) => state.undo);
  const redo = useChessStore((state) => state.redo);
  const flipBoard = useChessStore((state) => state.flipBoard);
  const saveCurrentGame = useChessStore((state) => state.saveCurrentGame);
  const setComputerPreferences = useChessStore((state) => state.setComputerPreferences);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[24px] bg-[#312E2B] px-4 py-3 text-white shadow-board">
      <button
        className={`pill ${mode === "human" ? "ring-2 ring-[#81B64C]" : ""}`}
        type="button"
        onClick={() => newGame("human")}
      >
        Play a Friend
      </button>
      <button
        className={`pill ${mode === "computer" ? "ring-2 ring-[#81B64C]" : ""}`}
        type="button"
        onClick={() => newGame("computer")}
      >
        Play Computer
      </button>

      {mode === "computer" ? (
        <select
          className="rounded-2xl bg-white/5 px-3 py-2 text-sm"
          value={difficulty}
          onChange={(event) =>
            setComputerPreferences({
              difficulty: event.target.value as typeof difficulty
            })
          }
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      ) : null}

      <span className="mx-1 h-6 w-px bg-white/10" />

      <button className="pill" type="button" onClick={undo}>
        Undo
      </button>
      <button className="pill" type="button" onClick={redo}>
        Redo
      </button>
      <button className="pill" type="button" onClick={flipBoard}>
        Flip
      </button>
      <button className="pill" type="button" onClick={() => saveCurrentGame()}>
        Save
      </button>
    </div>
  );
}
