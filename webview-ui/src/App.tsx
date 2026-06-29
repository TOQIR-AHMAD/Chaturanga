import { useEffect, useMemo, useRef, useState } from "react";

import type { ExtensionToWebviewMessage } from "../../src/types/messages";
import { ChessBoard } from "./components/ChessBoard";
import { MoveHistory } from "./components/MoveHistory";
import { PromotionDialog } from "./components/PromotionDialog";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { playSound } from "./services/audio";
import { createChess } from "./services/chess-core";
import {
  fetchChessComProfile,
  fetchLichessProfile,
  importChessComGames,
  importLichessGames
} from "./services/online";
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

type WorkerResult = {
  type: "result";
  requestId: number;
  depth: number;
  bestMove?: string;
  lines: Array<{
    move: string;
    san: string;
    pv: string[];
    score: number;
    depth: number;
  }>;
};

const localStorageKey = "chess-vscode.workspace";

export default function App() {
  const state = useChessStore();
  const derived = selectDerivedState(state);
  const workerRef = useRef<Worker | null>(null);
  const tickRef = useRef<number | null>(null);
  const lastMoveCount = useRef(0);
  const [fenInput, setFenInput] = useState("");
  const [pgnInput, setPgnInput] = useState("");

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
      return;
    }

    if (latest.flags.includes("k") || latest.flags.includes("q")) {
      playSound("castle", state.settings.sounds);
      return;
    }

    if (latest.captured) {
      playSound("capture", state.settings.sounds);
      return;
    }

    if (derived.chess.isGameOver()) {
      playSound("gameover", state.settings.sounds);
      return;
    }

    if (derived.chess.isCheck()) {
      playSound("check", state.settings.sounds);
      return;
    }

    playSound("move", state.settings.sounds);
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

  useEffect(() => {
    workerRef.current = new Worker(new URL("./workers/engine.worker.ts", import.meta.url), {
      type: "module"
    });

    workerRef.current.onmessage = (event: MessageEvent<WorkerResult>) => {
      const message = event.data;
      useChessStore.getState().setEngineResult(message.lines, message.depth, message.bestMove);
      const store = useChessStore.getState();
      const chess = createChess(store.initialFen, store.moves, store.cursor);

      const isComputerTurn =
        store.mode === "computer" &&
        chess.turn() === store.computerColor &&
        store.cursor === store.moves.length &&
        Boolean(message.bestMove);

      if (isComputerTurn && message.bestMove) {
        store.selectSquare(message.bestMove.slice(0, 2));
        store.selectSquare(message.bestMove.slice(2, 4));
      }
    };

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chess = derived.chess;
    const shouldAnalyze = state.settings.showEvaluationBar || state.mode !== "human";
    if (!workerRef.current || !shouldAnalyze) {
      return;
    }

    const requestId = Date.now();
    useChessStore.getState().setEngineThinking(true, requestId);
    workerRef.current.postMessage({
      type: "analyze",
      requestId,
      fen: chess.fen(),
      depth: state.settings.engineDepth,
      multiPv: state.engine.multiPv,
      infinite: state.mode === "analysis" || state.mode === "computer"
    });
  }, [
    state.initialFen,
    state.moves,
    state.cursor,
    state.mode,
    state.settings.engineDepth,
    state.settings.showEvaluationBar,
    state.engine.multiPv,
    derived.chess
  ]);

  const boardStatus = useMemo(() => {
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
  }, [derived, state.whiteMs, state.blackMs]);

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
        store.newGame(store.mode);
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
      case "analyze":
        if (typeof message.payload === "object" && message.payload && "pgn" in message.payload) {
          store.loadPgn(String((message.payload as { pgn: string }).pgn));
        } else if (
          typeof message.payload === "object" &&
          message.payload &&
          "fen" in message.payload
        ) {
          store.loadFen(String((message.payload as { fen: string }).fen));
        } else {
          store.setMode("analysis");
        }
        break;
      case "resumeGame":
        if (message.payload && typeof message.payload === "object" && "id" in message.payload) {
          store.resumeGame(message.payload as never);
        } else {
          store.setView("saved");
        }
        break;
      case "openAnalysisBoard":
        store.newGame("analysis");
        break;
      case "copyFenRequest":
        postToExtension({
          type: "copyText",
          payload: {
            label: "FEN",
            value: chess.fen()
          }
        });
        break;
      case "requestExportPgn":
        postToExtension({
          type: "exportPgn",
          payload: {
            name: store.currentGameId ?? "game",
            pgn: chess.pgn()
          }
        });
        break;
      case "openSettings":
        store.setView("settings");
        break;
      default:
        break;
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(129,182,76,0.2),_transparent_40%),linear-gradient(180deg,_#262522_0%,_#1b1a18_100%)] p-4 font-ui text-white md:p-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <header className="flex flex-col gap-3 rounded-[30px] border border-white/10 bg-black/15 px-5 py-4 backdrop-blur-sm md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#81B64C]">
              Chaturanga for VS Code
            </p>
            <h1 className="mt-2 font-display text-3xl md:text-4xl">
              Local board, analysis, puzzles, and imports.
            </h1>
          </div>
          <div className="rounded-3xl bg-[#312E2B] px-4 py-3 text-sm text-white/80">
            {boardStatus}
          </div>
        </header>

        <Toolbar />

        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <Sidebar />

          <main className="relative flex flex-col gap-4 rounded-[30px] border border-white/10 bg-black/10 p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="relative">
                {state.settings.showEvaluationBar ? (
                  <div className="absolute left-0 top-0 z-10 hidden h-full w-5 overflow-hidden rounded-l-3xl bg-white/10 md:block">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-[#81B64C] transition-all duration-300"
                      style={{
                        height: `${Math.max(
                          0,
                          Math.min(100, 50 + state.engine.evaluation / 20)
                        )}%`
                      }}
                    />
                  </div>
                ) : null}
                <div className="md:pl-6">
                  <ChessBoard />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-3xl border border-white/10 bg-[#312E2B] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                    Engine
                  </p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span>{state.engine.thinking ? "Thinking..." : "Ready"}</span>
                    <span>Depth {state.settings.engineDepth}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {state.engine.lines.map((line, index) => (
                      <div
                        key={`${line.move}-${index}`}
                        className="rounded-2xl bg-black/15 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span>
                            #{index + 1} {line.san}
                          </span>
                          <span>{(line.score / 100).toFixed(2)}</span>
                        </div>
                        <p className="mt-1 text-white/65">{line.pv.join(" ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <MoveHistory />
              </div>
            </div>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-[#312E2B] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">FEN</p>
                <textarea
                  className="mt-3 h-24 w-full rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-sm outline-none"
                  value={fenInput}
                  onChange={(event) => setFenInput(event.target.value)}
                  placeholder={derived.chess.fen()}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    className="pill"
                    type="button"
                    onClick={() => useChessStore.getState().loadFen(fenInput)}
                  >
                    Load FEN
                  </button>
                  <button
                    className="pill"
                    type="button"
                    onClick={() =>
                      postToExtension({
                        type: "copyText",
                        payload: {
                          label: "FEN",
                          value: derived.chess.fen()
                        }
                      })
                    }
                  >
                    Copy FEN
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#312E2B] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">PGN</p>
                <textarea
                  className="mt-3 h-24 w-full rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-sm outline-none"
                  value={pgnInput}
                  onChange={(event) => setPgnInput(event.target.value)}
                  placeholder="Paste PGN or use extension import"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    className="pill"
                    type="button"
                    onClick={() => useChessStore.getState().loadPgn(pgnInput)}
                  >
                    Load PGN
                  </button>
                  <button
                    className="pill"
                    type="button"
                    onClick={() =>
                      postToExtension({
                        type: "exportPgn",
                        payload: {
                          name: state.currentGameId ?? "game",
                          pgn: derived.chess.pgn()
                        }
                      })
                    }
                  >
                    Export PGN
                  </button>
                </div>
              </div>
            </section>

            {state.view === "saved" ? <SavedGames /> : null}
            {state.view === "recent" ? <RecentGames /> : null}
            {state.view === "settings" ? <SettingsPanel /> : null}
            <OnlineImportPanel />
            <PromotionDialog />
          </main>

          <section className="flex flex-col gap-4 rounded-[30px] border border-white/10 bg-black/10 p-4">
            <CapturedPieces />
            <RecentSnapshot />
          </section>
        </div>
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
        {savedGames.map((game) => (
          <div key={game.id} className="rounded-2xl bg-black/15 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">{game.name}</h3>
                <p className="text-sm text-white/60">
                  {game.mode} - {game.opening ?? game.result}
                </p>
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
          Theme
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
        <label className="rounded-2xl bg-black/15 px-3 py-3 text-sm">
          Piece Set
          <select
            className="mt-2 w-full rounded-xl bg-black/15 px-3 py-2"
            value={settings.pieceSet}
            onChange={(event) => updateSettings({ pieceSet: event.target.value as never })}
          >
            <option value="classic">Classic</option>
            <option value="neo">Neo</option>
            <option value="alpha">Alpha</option>
            <option value="wood">Wood</option>
          </select>
        </label>
        <label className="rounded-2xl bg-black/15 px-3 py-3 text-sm">
          Engine Depth
          <input
            className="mt-2 w-full"
            type="range"
            min={4}
            max={24}
            step={1}
            value={settings.engineDepth}
            onChange={(event) =>
              updateSettings({ engineDepth: Number(event.target.value) })
            }
          />
          <span>{settings.engineDepth}</span>
        </label>
        <label className="rounded-2xl bg-black/15 px-3 py-3 text-sm">
          Animation Speed
          <input
            className="mt-2 w-full"
            type="range"
            min={0}
            max={400}
            step={20}
            value={settings.animationSpeed}
            onChange={(event) =>
              updateSettings({ animationSpeed: Number(event.target.value) })
            }
          />
          <span>{settings.animationSpeed} ms</span>
        </label>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {[
          ["sounds", "Sounds"],
          ["showCoordinates", "Coordinates"],
          ["autoSave", "Auto Save"],
          ["autoFlipBoard", "Auto Flip"],
          ["showLegalMoves", "Legal Moves"],
          ["showEvaluationBar", "Evaluation Bar"]
        ].map(([key, label]) => (
          <label
            key={key}
            className="flex items-center justify-between rounded-2xl bg-black/15 px-3 py-3 text-sm"
          >
            <span>{label}</span>
            <input
              type="checkbox"
              checked={Boolean(settings[key as keyof typeof settings])}
              onChange={(event) =>
                updateSettings({ [key]: event.target.checked } as never)
              }
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function CapturedPieces() {
  const state = useChessStore();
  const { captured } = selectDerivedState(state);

  return (
    <section className="rounded-3xl border border-white/10 bg-[#312E2B] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Captured</p>
      <div className="mt-3 grid gap-3 text-sm">
        <div>
          <p className="text-white/55">White</p>
          <p>{captured.white.join(" ") || "None"}</p>
        </div>
        <div>
          <p className="text-white/55">Black</p>
          <p>{captured.black.join(" ") || "None"}</p>
        </div>
      </div>
    </section>
  );
}

function RecentSnapshot() {
  const state = useChessStore();
  const derived = selectDerivedState(state);

  return (
    <section className="rounded-3xl border border-white/10 bg-[#312E2B] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Game Info</p>
      <div className="mt-3 space-y-3 text-sm">
        <div className="rounded-2xl bg-black/15 px-3 py-3">
          <p className="text-white/55">Opening</p>
          <p>{derived.opening?.name ?? "Unclassified"}</p>
        </div>
        <div className="rounded-2xl bg-black/15 px-3 py-3">
          <p className="text-white/55">FEN</p>
          <p className="break-all text-xs">{derived.chess.fen()}</p>
        </div>
        <div className="rounded-2xl bg-black/15 px-3 py-3">
          <p className="text-white/55">PGN</p>
          <p className="text-xs">{derived.chess.pgn() || "No moves yet."}</p>
        </div>
      </div>
    </section>
  );
}

function OnlineImportPanel() {
  const online = useChessStore((store) => store.online);
  const setOnlineState = useChessStore((store) => store.setOnlineState);
  const importSavedGames = useChessStore((store) => store.importSavedGames);

  return (
    <section className="rounded-3xl border border-white/10 bg-[#312E2B] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Online Import</p>
      <div className="mt-3 grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_auto]">
        <select
          className="rounded-2xl bg-black/15 px-3 py-3 text-sm"
          value={online.provider}
          onChange={(event) =>
            setOnlineState({
              provider: event.target.value as "chesscom" | "lichess"
            })
          }
        >
          <option value="chesscom">Chess.com</option>
          <option value="lichess">Lichess</option>
        </select>
        <input
          className="rounded-2xl bg-black/15 px-3 py-3 text-sm"
          placeholder="username"
          value={online.username}
          onChange={(event) => setOnlineState({ username: event.target.value })}
        />
        <button
          className="button-primary"
          type="button"
          onClick={async () => {
            setOnlineState({ loading: true, message: "Loading profile..." });
            try {
              const profile =
                online.provider === "chesscom"
                  ? await fetchChessComProfile(online.username)
                  : await fetchLichessProfile(online.username);
              setOnlineState({
                loading: false,
                message: `${profile.username}${profile.title ? ` (${profile.title})` : ""} - ${profile.ratingSummary}`
              });
            } catch (error) {
              setOnlineState({
                loading: false,
                message:
                  error instanceof Error ? error.message : "Profile lookup failed."
              });
            }
          }}
        >
          Lookup
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="pill"
          type="button"
          onClick={async () => {
            setOnlineState({ loading: true, message: "Importing games..." });
            try {
              const games =
                online.provider === "chesscom"
                  ? await importChessComGames(online.username)
                  : await importLichessGames(online.username);
              importSavedGames(games);
              setOnlineState({
                loading: false,
                message: `Imported ${games.length} games from ${online.provider}.`
              });
            } catch (error) {
              setOnlineState({
                loading: false,
                message: error instanceof Error ? error.message : "Import failed."
              });
            }
          }}
        >
          Import Games
        </button>
      </div>
      {online.message ? <p className="mt-3 text-sm text-white/70">{online.message}</p> : null}
    </section>
  );
}
