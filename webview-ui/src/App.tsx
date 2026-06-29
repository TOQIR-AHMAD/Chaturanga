import { useEffect, useMemo, useRef, useState } from "react";

import type { ExtensionToWebviewMessage } from "../../src/types/messages";
import { ChessBoard } from "./components/ChessBoard";
import { PromotionDialog } from "./components/PromotionDialog";
import { playSound } from "./services/audio";
import { createChess } from "./services/chess-core";
import {
  listenToExtension,
  persistWorkspace,
  postToExtension,
  signalReady
} from "./services/vscode";
import {
  selectDerivedState,
  serializeWorkspaceState,
  useChessStore
} from "./store/chessStore";
import { DIFFICULTY_DEPTH } from "./types";

type WorkerResult = {
  type: "result";
  requestId: number;
  depth: number;
  bestMove?: string;
};

const localStorageKey = "chess-vscode.workspace";

export default function App() {
  const state = useChessStore();
  const derived = selectDerivedState(state);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<{ id: number; depth: number } | null>(null);
  const tickRef = useRef<number | null>(null);
  const lastMoveCount = useRef(0);
  const [statusFlash] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const cached = window.localStorage.getItem(localStorageKey);
    if (cached) {
      try {
        useChessStore.getState().hydrate(JSON.parse(cached) as never);
      } catch {
        window.localStorage.removeItem(localStorageKey);
      }
    }

    signalReady();
    const unsubscribe = listenToExtension(handleExtensionMessage);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = useChessStore.subscribe((nextState) => {
      if (!nextState.hydrated) {
        return;
      }
      window.localStorage.setItem(
        localStorageKey,
        JSON.stringify(serializeWorkspaceState(nextState))
      );
      persistWorkspace(serializeWorkspaceState(nextState));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (lastMoveCount.current === state.cursor) {
      return;
    }

    const moveCountIncreased = state.cursor > lastMoveCount.current;
    lastMoveCount.current = state.cursor;
    if (!moveCountIncreased) {
      return;
    }

    const latest = derived.history.at(-1);
    if (!latest) {
      return;
    }

    if (latest.san.includes("=")) {
      playSound("promote", state.settings.sounds);
    } else if (latest.flags.includes("k") || latest.flags.includes("q")) {
      playSound("castle", state.settings.sounds);
    } else if (latest.captured) {
      playSound("capture", state.settings.sounds);
    } else if (derived.chess.isGameOver()) {
      playSound("gameover", state.settings.sounds);
    } else if (derived.chess.isCheck()) {
      playSound("check", state.settings.sounds);
    } else {
      playSound("move", state.settings.sounds);
    }
  }, [derived.chess, derived.history, state.cursor, state.settings.sounds]);

  useEffect(() => {
    tickRef.current = window.setInterval(() => {
      useChessStore.getState().tickClock(1000);
    }, 1000);
    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
      }
    };
  }, []);

  // Engine worker — only used to pick the computer's move. Optional: if the
  // webview blocks workers, the app stays fully playable for two humans.
  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL("./workers/engine.worker.ts", import.meta.url),
        { type: "module" }
      );
    } catch (error) {
      console.error("Chess engine worker failed to start:", error);
      workerRef.current = null;
      return;
    }

    workerRef.current.onmessage = (event: MessageEvent<WorkerResult>) => {
      const message = event.data;
      const pending = pendingRef.current;
      if (!pending || message.requestId !== pending.id) {
        return;
      }
      if (message.depth < pending.depth || !message.bestMove) {
        return;
      }
      pendingRef.current = null;
      const store = useChessStore.getState();
      store.setThinking(false);
      if (store.mode !== "computer" || store.cursor !== store.moves.length) {
        return;
      }
      const chess = createChess(store.initialFen, store.moves, store.cursor);
      if (chess.turn() !== store.computerColor || chess.isGameOver()) {
        return;
      }
      store.playMove(
        message.bestMove.slice(0, 2),
        message.bestMove.slice(2, 4),
        (message.bestMove[4] as "q" | "r" | "b" | "n" | undefined) ?? undefined
      );
    };

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Ask the engine for a move only when it is the computer's turn.
  useEffect(() => {
    const worker = workerRef.current;
    const atLivePosition = state.cursor === state.moves.length;
    const chess = createChess(state.initialFen, state.moves, state.cursor);
    const computersTurn =
      state.mode === "computer" &&
      atLivePosition &&
      !chess.isGameOver() &&
      chess.turn() === state.computerColor;

    if (!worker || !computersTurn) {
      if (useChessStore.getState().thinking) {
        useChessStore.getState().setThinking(false);
      }
      return;
    }

    const depth = DIFFICULTY_DEPTH[state.difficulty];
    const requestId = Date.now();
    pendingRef.current = { id: requestId, depth };
    useChessStore.getState().setThinking(true);
    worker.postMessage({
      type: "analyze",
      requestId,
      fen: chess.fen(),
      depth,
      multiPv: 1,
      infinite: false
    });
  }, [
    state.mode,
    state.initialFen,
    state.moves,
    state.cursor,
    state.computerColor,
    state.difficulty
  ]);

  // Push a compact view-model to the extension so the activity-bar sidebar
  // (a separate webview) can show live game info and controls.
  useEffect(() => {
    const s = useChessStore.getState();
    const d = selectDerivedState(s);
    postToExtension({
      type: "uiState",
      payload: {
        status: s.thinking ? "Computer is thinking…" : d.statusText,
        turn: d.chess.turn() === "w" ? "White" : "Black",
        result: d.result,
        whiteClock: d.clocks.white,
        blackClock: d.clocks.black,
        moves: d.history.map((move) => move.san),
        capturedWhite: d.captured.white.join(" "),
        capturedBlack: d.captured.black.join(" "),
        mode: s.mode,
        difficulty: s.difficulty
      }
    });
  }, [
    state.moves,
    state.cursor,
    state.thinking,
    state.mode,
    state.difficulty,
    state.whiteMs,
    state.blackMs,
    state.hydrated
  ]);

  const boardStatus = useMemo(() => {
    if (state.thinking) {
      return "Computer is thinking…";
    }
    if (state.whiteMs === 0 || state.blackMs === 0) {
      return derived.statusText;
    }
    if (derived.chess.isCheckmate()) {
      return derived.result === "1-0"
        ? "White wins by checkmate"
        : "Black wins by checkmate";
    }
    if (derived.chess.isDraw()) {
      return "Drawn position";
    }
    return `${derived.chess.turn() === "w" ? "White" : "Black"} to move`;
  }, [derived, state.whiteMs, state.blackMs, state.thinking]);

  function handleExtensionMessage(message: ExtensionToWebviewMessage) {
    if (message.type === "hydrate") {
      useChessStore.getState().hydrate(message.payload as never);
      return;
    }

    if (message.type !== "command") {
      return;
    }

    const store = useChessStore.getState();
    const chess = createChess(store.initialFen, store.moves, store.cursor);

    switch (message.command) {
      case "newGame":
        store.newGame();
        break;
      case "newHuman":
        store.newGame("human");
        break;
      case "newComputer":
        store.newGame("computer");
        break;
      case "setDifficulty":
        if (message.payload && typeof message.payload === "object" && "difficulty" in message.payload) {
          store.setComputerPreferences({
            difficulty: (message.payload as { difficulty: "easy" | "medium" | "hard" }).difficulty
          });
        }
        break;
      case "save":
        store.saveCurrentGame();
        break;
      case "flipBoard":
        store.flipBoard();
        break;
      case "undo":
        store.undo();
        break;
      case "redo":
        store.redo();
        break;
      case "importPgn":
        if (message.payload && typeof message.payload === "object" && "pgn" in message.payload) {
          store.loadPgn(String((message.payload as { pgn: string }).pgn));
        }
        break;
      case "loadFen":
        if (message.payload && typeof message.payload === "object" && "fen" in message.payload) {
          store.loadFen(String((message.payload as { fen: string }).fen));
        }
        break;
      case "resumeGame":
        if (message.payload && typeof message.payload === "object" && "id" in message.payload) {
          store.resumeGame(message.payload as never);
        } else {
          store.setView("saved");
        }
        break;
      case "copyFenRequest":
        postToExtension({
          type: "copyText",
          payload: { label: "FEN", value: chess.fen() }
        });
        break;
      case "requestExportPgn":
        postToExtension({
          type: "exportPgn",
          payload: { name: store.currentGameId ?? "game", pgn: chess.pgn() }
        });
        break;
      case "openSettings":
        store.setView("settings");
        break;
      default:
        break;
    }
  }

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#1b1a18] p-3 font-ui text-white">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-white/70">{boardStatus}</span>
          <button className="pill" type="button" onClick={() => setFullscreen(false)}>
            Exit Fullscreen
          </button>
        </div>
        <div className="grid flex-1 place-items-center overflow-auto">
          <div className="relative w-full" style={{ maxWidth: "min(92vh, 100%)" }}>
            <ChessBoard />
            <PromotionDialog />
          </div>
        </div>
        {state.toast ? (
          <div className="fixed bottom-5 right-5 rounded-2xl bg-black/70 px-4 py-3 text-sm shadow-lg">
            {state.toast}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(129,182,76,0.2),_transparent_40%),linear-gradient(180deg,_#262522_0%,_#1b1a18_100%)] p-4 font-ui text-white md:p-6">
      <div className="mx-auto flex max-w-[760px] flex-col gap-4">
        <header className="flex items-center justify-between gap-3 rounded-[30px] border border-white/10 bg-black/15 px-5 py-3 backdrop-blur-sm">
          <h1 className="font-display text-xl md:text-2xl">{boardStatus || statusFlash}</h1>
          <button className="pill shrink-0" type="button" onClick={() => setFullscreen(true)}>
            Fullscreen
          </button>
        </header>

        <main className="relative flex flex-col gap-4">
          <div className="relative">
            <ChessBoard />
            <PromotionDialog />
          </div>

          {state.view === "saved" ? <SavedGames /> : null}
          {state.view === "recent" ? <RecentGames /> : null}
          {state.view === "settings" ? <SettingsPanel /> : null}
        </main>
      </div>

      {state.toast ? (
        <div className="fixed bottom-5 right-5 rounded-2xl bg-black/70 px-4 py-3 text-sm text-white shadow-lg">
          {state.toast}
        </div>
      ) : null}
    </div>
  );
}

function SavedGames() {
  const savedGames = useChessStore((store) => store.savedGames);
  const resumeGame = useChessStore((store) => store.resumeGame);
  const deleteSavedGame = useChessStore((store) => store.deleteSavedGame);
  const renameSavedGame = useChessStore((store) => store.renameSavedGame);

  return (
    <section className="rounded-3xl border border-white/10 bg-[#312E2B] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Saved Games</p>
      <div className="mt-3 space-y-3">
        {savedGames.length === 0 ? (
          <p className="text-sm text-white/50">No saved games yet.</p>
        ) : null}
        {savedGames.map((game) => (
          <div key={game.id} className="rounded-2xl bg-black/15 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">{game.name}</h3>
                <p className="text-sm text-white/60">{game.opening ?? game.result}</p>
              </div>
              <div className="flex gap-2">
                <button className="pill" type="button" onClick={() => resumeGame(game)}>
                  Resume
                </button>
                <button className="pill" type="button" onClick={() => deleteSavedGame(game.id)}>
                  Delete
                </button>
              </div>
            </div>
            <button
              className="mt-2 text-xs text-white/50 underline-offset-4 hover:underline"
              type="button"
              onClick={() => {
                const nextName = window.prompt("Rename saved game", game.name);
                if (nextName) {
                  renameSavedGame(game.id, nextName);
                }
              }}
            >
              Rename
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecentGames() {
  const recentGames = useChessStore((store) => store.recentGames);
  const resumeGame = useChessStore((store) => store.resumeGame);

  return (
    <section className="rounded-3xl border border-white/10 bg-[#312E2B] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Recent Games</p>
      <div className="mt-3 space-y-3">
        {recentGames.length === 0 ? (
          <p className="text-sm text-white/50">No recent games yet.</p>
        ) : null}
        {recentGames.map((game) => (
          <button
            key={game.id}
            type="button"
            className="flex w-full items-center justify-between rounded-2xl bg-black/15 px-3 py-3 text-left transition hover:bg-black/25"
            onClick={() => resumeGame(game)}
          >
            <div>
              <div className="font-semibold">{game.name}</div>
              <div className="text-sm text-white/55">{game.updatedAt}</div>
            </div>
            <div className="text-sm text-white/65">{game.result}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

function SettingsPanel() {
  const settings = useChessStore((store) => store.settings);
  const updateSettings = useChessStore((store) => store.updateSettings);

  return (
    <section className="rounded-3xl border border-white/10 bg-[#312E2B] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Settings</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="rounded-2xl bg-black/15 px-3 py-3 text-sm">
          Board Theme
          <select
            className="mt-2 w-full rounded-xl bg-black/15 px-3 py-2"
            value={settings.theme}
            onChange={(event) => updateSettings({ theme: event.target.value as never })}
          >
            <option value="classic">Classic</option>
            <option value="green">Green</option>
            <option value="blue">Blue</option>
            <option value="dark">Dark</option>
            <option value="purple">Purple</option>
          </select>
        </label>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {[
          ["sounds", "Sounds"],
          ["showCoordinates", "Coordinates"],
          ["autoSave", "Auto Save"],
          ["showLegalMoves", "Legal Moves"]
        ].map(([key, label]) => (
          <label
            key={key}
            className="flex items-center justify-between rounded-2xl bg-black/15 px-3 py-3 text-sm"
          >
            <span>{label}</span>
            <input
              type="checkbox"
              checked={Boolean(settings[key as keyof typeof settings])}
              onChange={(event) => updateSettings({ [key]: event.target.checked } as never)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

