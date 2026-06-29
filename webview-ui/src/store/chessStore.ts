import { create } from "zustand";
import type { Color, Square } from "chess.js";

import type {
  ChessSettings,
  Difficulty,
  EngineLine,
  GameMode,
  Orientation,
  PersistedCurrentState,
  SavedGame,
  WorkspaceState
} from "../types";
import { puzzles } from "../services/puzzles";
import {
  START_FEN,
  createChess,
  formatClock,
  getCapturedPieces,
  getHistory,
  getLegalTargets,
  getOpeningSummary,
  getResult,
  importPgn,
  moveToUci,
  setPieceAtFen,
  validateFen
} from "../services/chess-core";

const defaultSettings: ChessSettings = {
  theme: "classic",
  pieceSet: "classic",
  animationSpeed: 180,
  showCoordinates: true,
  sounds: true,
  engineDepth: 12,
  autoSave: true,
  autoFlipBoard: false,
  showLegalMoves: true,
  showEvaluationBar: true
};

const defaultCurrentState: PersistedCurrentState = {
  mode: "human",
  view: "board",
  initialFen: START_FEN,
  moves: [],
  cursor: 0,
  orientation: "white",
  currentGameId: null,
  settings: defaultSettings,
  computerColor: "b",
  difficulty: "intermediate",
  whiteMs: 600000,
  blackMs: 600000,
  puzzleIndex: 0,
  puzzleStreak: 0
};

type EngineState = {
  thinking: boolean;
  lines: EngineLine[];
  bestMove: string | null;
  evaluation: number;
  infinite: boolean;
  multiPv: number;
  requestId: number;
};

type OnlineState = {
  loading: boolean;
  provider: "chesscom" | "lichess";
  username: string;
  message: string | null;
};

interface ChessStoreState extends PersistedCurrentState {
  hydrated: boolean;
  savedGames: SavedGame[];
  recentGames: SavedGame[];
  selectedSquare: string | null;
  legalTargets: string[];
  pendingPromotion: { from: string; to: string } | null;
  editMode: boolean;
  editorPiece: string | null;
  analysisSideToMove: Color;
  puzzleSolved: boolean;
  puzzleStep: number;
  engine: EngineState;
  online: OnlineState;
  toast: string | null;
  setToast: (value: string | null) => void;
  hydrate: (payload: WorkspaceState) => void;
  setView: (view: ChessStoreState["view"]) => void;
  setMode: (mode: GameMode) => void;
  newGame: (mode?: GameMode) => void;
  selectSquare: (square: string) => void;
  clearSquare: (square: string) => void;
  setEditorPiece: (piece: string | null) => void;
  toggleEditMode: () => void;
  setAnalysisSideToMove: (side: Color) => void;
  promote: (promotion: "q" | "r" | "b" | "n") => void;
  cancelPromotion: () => void;
  undo: () => void;
  redo: () => void;
  jumpTo: (ply: number) => void;
  flipBoard: () => void;
  loadFen: (fen: string) => boolean;
  loadPgn: (pgn: string) => boolean;
  saveCurrentGame: (name?: string) => void;
  resumeGame: (game: SavedGame) => void;
  deleteSavedGame: (id: string) => void;
  renameSavedGame: (id: string, name: string) => void;
  importSavedGames: (games: SavedGame[]) => void;
  updateSettings: (partial: Partial<ChessSettings>) => void;
  setComputerPreferences: (partial: {
    difficulty?: Difficulty;
    computerColor?: "w" | "b";
  }) => void;
  tickClock: (elapsedMs: number) => void;
  resetPuzzle: () => void;
  nextPuzzle: () => void;
  setEngineResult: (lines: EngineLine[], depth: number, bestMove?: string) => void;
  setEngineThinking: (thinking: boolean, requestId?: number) => void;
  setOnlineState: (partial: Partial<OnlineState>) => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildSavedGame(state: ChessStoreState, name: string): SavedGame {
  const chess = createChess(state.initialFen, state.moves, state.cursor);
  return {
    id: state.currentGameId ?? `game-${Date.now().toString(36)}`,
    name,
    mode: state.mode,
    pgn: chess.pgn(),
    fen: chess.fen(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    result: getResult(chess),
    opening: getOpeningSummary(state.initialFen, state.moves, state.cursor)?.name,
    initialFen: state.initialFen,
    moves: state.moves,
    cursor: state.cursor,
    orientation: state.orientation,
    whiteMs: state.whiteMs,
    blackMs: state.blackMs,
    difficulty: state.difficulty,
    computerColor: state.computerColor
  };
}

function updateTimeline(
  state: ChessStoreState,
  from: string,
  to: string,
  promotion?: "q" | "r" | "b" | "n"
): Partial<ChessStoreState> | null {
  const chess = createChess(state.initialFen, state.moves, state.cursor);
  const piece = chess.get(from as Square);
  if (!piece) {
    return null;
  }

  const requiresPromotion =
    piece.type === "p" && ((piece.color === "w" && to.endsWith("8")) || (piece.color === "b" && to.endsWith("1")));
  if (requiresPromotion && !promotion) {
    return {
      pendingPromotion: {
        from,
        to
      }
    };
  }

  const result = chess.move({
    from: from as Square,
    to: to as Square,
    promotion
  });

  if (!result) {
    return null;
  }

  const nextMoves = state.moves.slice(0, state.cursor);
  nextMoves.push(moveToUci(result));

  return {
    moves: nextMoves,
    cursor: nextMoves.length,
    selectedSquare: null,
    legalTargets: [],
    pendingPromotion: null,
    currentGameId: state.currentGameId ?? `game-${Date.now().toString(36)}`,
    toast: null
  };
}

function mergeRecent(list: SavedGame[], game: SavedGame): SavedGame[] {
  return [game, ...list.filter((entry) => entry.id !== game.id)].slice(0, 10);
}

function serializeCurrentState(state: ChessStoreState): PersistedCurrentState {
  return {
    mode: state.mode,
    view: state.view,
    initialFen: state.initialFen,
    moves: state.moves,
    cursor: state.cursor,
    orientation: state.orientation,
    currentGameId: state.currentGameId,
    settings: state.settings,
    computerColor: state.computerColor,
    difficulty: state.difficulty,
    whiteMs: state.whiteMs,
    blackMs: state.blackMs,
    puzzleIndex: state.puzzleIndex,
    puzzleStreak: state.puzzleStreak
  };
}

export function serializeWorkspaceState(state: ChessStoreState): WorkspaceState {
  return {
    currentState: serializeCurrentState(state),
    savedGames: state.savedGames,
    recentGames: state.recentGames,
    settings: state.settings
  };
}

export const useChessStore = create<ChessStoreState>((set, get) => ({
  ...defaultCurrentState,
  hydrated: false,
  savedGames: [],
  recentGames: [],
  selectedSquare: null,
  legalTargets: [],
  pendingPromotion: null,
  editMode: false,
  editorPiece: "wq",
  analysisSideToMove: "w",
  puzzleSolved: false,
  puzzleStep: 0,
  engine: {
    thinking: false,
    lines: [],
    bestMove: null,
    evaluation: 0,
    infinite: true,
    multiPv: 3,
    requestId: 0
  },
  online: {
    loading: false,
    provider: "chesscom",
    username: "",
    message: null
  },
  toast: null,
  setToast: (value) => set({ toast: value }),
  hydrate: (payload) =>
    set(() => ({
      ...(payload.currentState ?? defaultCurrentState),
      hydrated: true,
      settings:
        (payload.currentState?.settings ?? payload.settings ?? defaultSettings) as ChessSettings,
      savedGames: payload.savedGames ?? [],
      recentGames: payload.recentGames ?? [],
      selectedSquare: null,
      legalTargets: [],
      pendingPromotion: null
    })),
  setView: (view) => set({ view }),
  setMode: (mode) => set({ mode, view: "board" }),
  newGame: (mode = "human") =>
    set((state) => ({
      mode,
      view: "board",
      initialFen: mode === "puzzle" ? puzzles[state.puzzleIndex].fen : START_FEN,
      moves: [],
      cursor: 0,
      selectedSquare: null,
      legalTargets: [],
      pendingPromotion: null,
      currentGameId: null,
      orientation: "white",
      whiteMs: 600000,
      blackMs: 600000,
      puzzleSolved: false,
      puzzleStep: 0,
      editMode: mode === "analysis",
      analysisSideToMove: "w"
    })),
  selectSquare: (square) =>
    set((state) => {
      if (state.editMode && state.mode === "analysis") {
        const nextFen = setPieceAtFen(
          createChess(state.initialFen, state.moves, state.cursor).fen(),
          square,
          state.editorPiece,
          state.analysisSideToMove
        );
        return {
          initialFen: nextFen,
          moves: [],
          cursor: 0,
          selectedSquare: null,
          legalTargets: []
        };
      }

      const chess = createChess(state.initialFen, state.moves, state.cursor);
      const currentPiece = chess.get(square as Square);
      if (state.selectedSquare && state.legalTargets.includes(square)) {
        const next = updateTimeline(state, state.selectedSquare, square);
        if (!next) {
          return state;
        }
        if ("pendingPromotion" in next && next.pendingPromotion) {
          return next;
        }

        if (state.mode === "puzzle") {
          const expected = puzzles[state.puzzleIndex].solution[state.puzzleStep];
          const playedMove = (next.moves ?? state.moves)[(next.cursor ?? state.cursor) - 1];
          if (expected !== playedMove) {
            return {
              selectedSquare: null,
              legalTargets: [],
              toast: "That move does not solve the puzzle."
            };
          }
          const responseMove = puzzles[state.puzzleIndex].solution[state.puzzleStep + 1];
          const nextState = {
            ...next,
            puzzleStep: state.puzzleStep + 1
          };
          if (!responseMove) {
            return {
              ...nextState,
              puzzleSolved: true,
              puzzleStreak: state.puzzleStreak + 1,
              toast: "Puzzle solved."
            };
          }
          const afterReply = updateTimeline(
            {
              ...state,
              ...nextState
            } as ChessStoreState,
            responseMove.slice(0, 2),
            responseMove.slice(2, 4),
            (responseMove[4] as "q" | "r" | "b" | "n" | undefined) ?? undefined
          );
          return {
            ...nextState,
            ...afterReply,
            puzzleStep: state.puzzleStep + 2
          };
        }

        return next;
      }

      if (!currentPiece) {
        return {
          selectedSquare: null,
          legalTargets: []
        };
      }

      if (state.mode !== "analysis" && currentPiece.color !== chess.turn()) {
        return state;
      }

      return {
        selectedSquare: square,
        legalTargets: getLegalTargets(state.initialFen, state.moves, state.cursor, square)
      };
    }),
  clearSquare: (square) =>
    set((state) => {
      if (!state.editMode || state.mode !== "analysis") {
        return state;
      }
      const nextFen = setPieceAtFen(
        createChess(state.initialFen, state.moves, state.cursor).fen(),
        square,
        null,
        state.analysisSideToMove
      );
      return {
        initialFen: nextFen,
        moves: [],
        cursor: 0
      };
    }),
  setEditorPiece: (piece) => set({ editorPiece: piece }),
  toggleEditMode: () => set((state) => ({ editMode: !state.editMode })),
  setAnalysisSideToMove: (side) => set({ analysisSideToMove: side }),
  promote: (promotion) =>
    set((state) => {
      if (!state.pendingPromotion) {
        return state;
      }
      const next = updateTimeline(
        state,
        state.pendingPromotion.from,
        state.pendingPromotion.to,
        promotion
      );
      return next ?? state;
    }),
  cancelPromotion: () => set({ pendingPromotion: null }),
  undo: () =>
    set((state) => ({
      cursor: Math.max(0, state.cursor - 1),
      selectedSquare: null,
      legalTargets: []
    })),
  redo: () =>
    set((state) => ({
      cursor: Math.min(state.moves.length, state.cursor + 1),
      selectedSquare: null,
      legalTargets: []
    })),
  jumpTo: (ply) =>
    set((state) => ({
      cursor: Math.max(0, Math.min(ply, state.moves.length)),
      selectedSquare: null,
      legalTargets: []
    })),
  flipBoard: () =>
    set((state) => ({
      orientation: state.orientation === "white" ? "black" : "white"
    })),
  loadFen: (fen) => {
    if (!validateFen(fen)) {
      set({ toast: "Invalid FEN." });
      return false;
    }
    set({
      mode: "analysis",
      view: "board",
      initialFen: fen,
      moves: [],
      cursor: 0,
      editMode: true,
      selectedSquare: null,
      legalTargets: []
    });
    return true;
  },
  loadPgn: (pgn) => {
    try {
      const parsed = importPgn(pgn);
      set({
        mode: "analysis",
        view: "board",
        initialFen: parsed.initialFen,
        moves: parsed.moves,
        cursor: parsed.cursor,
        editMode: false,
        selectedSquare: null,
        legalTargets: []
      });
      return true;
    } catch {
      set({ toast: "PGN import failed." });
      return false;
    }
  },
  saveCurrentGame: (name) =>
    set((state) => {
      const gameName =
        name ||
        `${state.mode === "analysis" ? "Analysis" : "Game"} ${new Date().toLocaleString()}`;
      const saved = buildSavedGame(state, gameName);
      const existingIndex = state.savedGames.findIndex((entry) => entry.id === saved.id);
      const savedGames = [...state.savedGames];
      if (existingIndex >= 0) {
        savedGames[existingIndex] = {
          ...savedGames[existingIndex],
          ...saved
        };
      } else {
        savedGames.unshift(saved);
      }
      return {
        savedGames,
        recentGames: mergeRecent(state.recentGames, saved),
        currentGameId: saved.id,
        toast: "Game saved."
      };
    }),
  resumeGame: (game) =>
    set((state) => ({
      mode: game.mode as GameMode,
      view: "board",
      initialFen: game.initialFen,
      moves: game.moves,
      cursor: game.cursor,
      orientation: game.orientation,
      currentGameId: game.id,
      whiteMs: game.whiteMs,
      blackMs: game.blackMs,
      difficulty: game.difficulty,
      computerColor: game.computerColor,
      recentGames: mergeRecent(state.recentGames, game),
      selectedSquare: null,
      legalTargets: [],
      editMode: game.mode === "analysis"
    })),
  deleteSavedGame: (id) =>
    set((state) => ({
      savedGames: state.savedGames.filter((entry) => entry.id !== id),
      recentGames: state.recentGames.filter((entry) => entry.id !== id)
    })),
  renameSavedGame: (id, name) =>
    set((state) => ({
      savedGames: state.savedGames.map((entry) =>
        entry.id === id ? { ...entry, name, updatedAt: nowIso() } : entry
      )
    })),
  importSavedGames: (games) =>
    set((state) => ({
      savedGames: [...games, ...state.savedGames].slice(0, 40),
      recentGames: state.recentGames
    })),
  setComputerPreferences: (partial) =>
    set((state) => ({
      difficulty: partial.difficulty ?? state.difficulty,
      computerColor: partial.computerColor ?? state.computerColor,
      orientation:
        partial.computerColor === "w"
          ? "black"
          : partial.computerColor === "b"
            ? "white"
            : state.orientation
    })),
  updateSettings: (partial) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...partial
      }
    })),
  tickClock: (elapsedMs) =>
    set((state) => {
      const chess = createChess(state.initialFen, state.moves, state.cursor);
      if (chess.isGameOver()) {
        return state;
      }
      if (chess.turn() === "w") {
        return {
          whiteMs: Math.max(0, state.whiteMs - elapsedMs)
        };
      }
      return {
        blackMs: Math.max(0, state.blackMs - elapsedMs)
      };
    }),
  resetPuzzle: () =>
    set((state) => ({
      mode: "puzzle",
      view: "board",
      initialFen: puzzles[state.puzzleIndex].fen,
      moves: [],
      cursor: 0,
      selectedSquare: null,
      legalTargets: [],
      puzzleSolved: false,
      puzzleStep: 0
    })),
  nextPuzzle: () =>
    set((state) => {
      const nextIndex = (state.puzzleIndex + 1) % puzzles.length;
      return {
        puzzleIndex: nextIndex,
        mode: "puzzle",
        view: "board",
        initialFen: puzzles[nextIndex].fen,
        moves: [],
        cursor: 0,
        selectedSquare: null,
        legalTargets: [],
        puzzleSolved: false,
        puzzleStep: 0
      };
    }),
  setEngineResult: (lines, depth, bestMove) =>
    set({
      engine: {
        ...get().engine,
        thinking: false,
        lines,
        bestMove: bestMove ?? null,
        evaluation: lines[0]?.score ?? 0,
        requestId: get().engine.requestId
      }
    }),
  setEngineThinking: (thinking, requestId) =>
    set({
      engine: {
        ...get().engine,
        thinking,
        requestId: requestId ?? get().engine.requestId
      }
    }),
  setOnlineState: (partial) =>
    set({
      online: {
        ...get().online,
        ...partial
      }
    })
}));

export function selectDerivedState(state: ChessStoreState) {
  const chess = createChess(state.initialFen, state.moves, state.cursor);
  const history = getHistory(state.initialFen, state.moves, state.cursor);
  const captured = getCapturedPieces(state.initialFen, state.moves, state.cursor);
  const opening = getOpeningSummary(state.initialFen, state.moves, state.cursor);
  return {
    chess,
    history,
    opening,
    captured,
    result: getResult(chess),
    statusText:
      state.whiteMs === 0
        ? "Black wins on time"
        : state.blackMs === 0
          ? "White wins on time"
          : `${chess.turn() === "w" ? "White" : "Black"} to move`,
    clocks: {
      white: formatClock(state.whiteMs),
      black: formatClock(state.blackMs)
    }
  };
}
