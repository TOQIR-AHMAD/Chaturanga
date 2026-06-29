import { create } from "zustand";
import type { Square } from "chess.js";

import type {
  ChessSettings,
  Difficulty,
  GameMode,
  PersistedCurrentState,
  SavedGame,
  WorkspaceState
} from "../types";
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
  validateFen
} from "../services/chess-core";

const defaultSettings: ChessSettings = {
  theme: "classic",
  pieceSet: "classic",
  animationSpeed: 180,
  showCoordinates: true,
  sounds: true,
  autoSave: true,
  autoFlipBoard: false,
  showLegalMoves: true
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
  difficulty: "medium",
  whiteMs: 600000,
  blackMs: 600000
};

interface ChessStoreState extends PersistedCurrentState {
  hydrated: boolean;
  thinking: boolean;
  savedGames: SavedGame[];
  recentGames: SavedGame[];
  selectedSquare: string | null;
  legalTargets: string[];
  pendingPromotion: { from: string; to: string } | null;
  toast: string | null;
  setToast: (value: string | null) => void;
  setThinking: (value: boolean) => void;
  hydrate: (payload: WorkspaceState) => void;
  setView: (view: ChessStoreState["view"]) => void;
  setMode: (mode: GameMode) => void;
  newGame: (mode?: GameMode) => void;
  selectSquare: (square: string) => void;
  playMove: (from: string, to: string, promotion?: "q" | "r" | "b" | "n") => void;
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
  updateSettings: (partial: Partial<ChessSettings>) => void;
  setComputerPreferences: (partial: {
    difficulty?: Difficulty;
    computerColor?: "w" | "b";
  }) => void;
  tickClock: (elapsedMs: number) => void;
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
    computerColor: state.computerColor,
    difficulty: state.difficulty
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
    piece.type === "p" &&
    ((piece.color === "w" && to.endsWith("8")) || (piece.color === "b" && to.endsWith("1")));
  if (requiresPromotion && !promotion) {
    return {
      pendingPromotion: { from, to }
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
    blackMs: state.blackMs
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

export const useChessStore = create<ChessStoreState>((set) => ({
  ...defaultCurrentState,
  hydrated: false,
  thinking: false,
  savedGames: [],
  recentGames: [],
  selectedSquare: null,
  legalTargets: [],
  pendingPromotion: null,
  toast: null,
  setToast: (value) => set({ toast: value }),
  setThinking: (value) => set({ thinking: value }),
  hydrate: (payload) =>
    set(() => ({
      ...(payload.currentState ?? defaultCurrentState),
      hydrated: true,
      settings: (payload.currentState?.settings ??
        payload.settings ??
        defaultSettings) as ChessSettings,
      savedGames: payload.savedGames ?? [],
      recentGames: payload.recentGames ?? [],
      selectedSquare: null,
      legalTargets: [],
      pendingPromotion: null
    })),
  setView: (view) => set({ view }),
  setMode: (mode) => set({ mode, view: "board" }),
  newGame: (mode) =>
    set((state) => ({
      mode: mode ?? state.mode,
      view: "board",
      initialFen: START_FEN,
      moves: [],
      cursor: 0,
      selectedSquare: null,
      legalTargets: [],
      pendingPromotion: null,
      currentGameId: null,
      orientation: (mode ?? state.mode) === "computer" && state.computerColor === "w"
        ? "black"
        : "white",
      whiteMs: 600000,
      blackMs: 600000,
      thinking: false
    })),
  selectSquare: (square) =>
    set((state) => {
      const chess = createChess(state.initialFen, state.moves, state.cursor);

      // In computer mode, the human only controls their own colour.
      if (state.mode === "computer" && chess.turn() === state.computerColor) {
        return state;
      }

      const currentPiece = chess.get(square as Square);

      if (state.selectedSquare && state.legalTargets.includes(square)) {
        const next = updateTimeline(state, state.selectedSquare, square);
        if (!next) {
          return state;
        }
        return next;
      }

      if (!currentPiece) {
        return { selectedSquare: null, legalTargets: [] };
      }

      if (currentPiece.color !== chess.turn()) {
        return state;
      }

      return {
        selectedSquare: square,
        legalTargets: getLegalTargets(state.initialFen, state.moves, state.cursor, square)
      };
    }),
  playMove: (from, to, promotion) =>
    set((state) => updateTimeline(state, from, to, promotion) ?? state),
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
      // In computer mode, step back over the computer's reply too.
      cursor: Math.max(0, state.cursor - (state.mode === "computer" ? 2 : 1)),
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
      mode: "human",
      view: "board",
      initialFen: fen,
      moves: [],
      cursor: 0,
      selectedSquare: null,
      legalTargets: [],
      currentGameId: null
    });
    return true;
  },
  loadPgn: (pgn) => {
    try {
      const parsed = importPgn(pgn);
      set({
        mode: "human",
        view: "board",
        initialFen: parsed.initialFen,
        moves: parsed.moves,
        cursor: parsed.cursor,
        selectedSquare: null,
        legalTargets: [],
        currentGameId: null
      });
      return true;
    } catch {
      set({ toast: "PGN import failed." });
      return false;
    }
  },
  saveCurrentGame: (name) =>
    set((state) => {
      const gameName = name || `Game ${new Date().toLocaleString()}`;
      const saved = buildSavedGame(state, gameName);
      const existingIndex = state.savedGames.findIndex((entry) => entry.id === saved.id);
      const savedGames = [...state.savedGames];
      if (existingIndex >= 0) {
        savedGames[existingIndex] = { ...savedGames[existingIndex], ...saved };
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
      mode: (game.mode === "computer" ? "computer" : "human") as GameMode,
      view: "board",
      initialFen: game.initialFen,
      moves: game.moves,
      cursor: game.cursor,
      orientation: game.orientation,
      currentGameId: game.id,
      whiteMs: game.whiteMs,
      blackMs: game.blackMs,
      computerColor: game.computerColor ?? state.computerColor,
      difficulty: game.difficulty ?? state.difficulty,
      recentGames: mergeRecent(state.recentGames, game),
      selectedSquare: null,
      legalTargets: []
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
  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial }
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
  tickClock: (elapsedMs) =>
    set((state) => {
      const chess = createChess(state.initialFen, state.moves, state.cursor);
      if (chess.isGameOver()) {
        return state;
      }
      if (chess.turn() === "w") {
        return { whiteMs: Math.max(0, state.whiteMs - elapsedMs) };
      }
      return { blackMs: Math.max(0, state.blackMs - elapsedMs) };
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
