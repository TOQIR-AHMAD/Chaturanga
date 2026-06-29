import { useChessStore } from "../store/chessStore";

export function Toolbar() {
  const newGame = useChessStore((state) => state.newGame);
  const undo = useChessStore((state) => state.undo);
  const redo = useChessStore((state) => state.redo);
  const flipBoard = useChessStore((state) => state.flipBoard);
  const saveCurrentGame = useChessStore((state) => state.saveCurrentGame);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[24px] bg-[#312E2B] px-4 py-3 text-white shadow-board">
      <button className="button-primary" type="button" onClick={() => newGame()}>
        New Game
      </button>
      <button className="pill" type="button" onClick={undo}>
        Undo
      </button>
      <button className="pill" type="button" onClick={redo}>
        Redo
      </button>
      <button className="pill" type="button" onClick={flipBoard}>
        Flip Board
      </button>
      <button className="pill" type="button" onClick={() => saveCurrentGame()}>
        Save
      </button>
    </div>
  );
}
