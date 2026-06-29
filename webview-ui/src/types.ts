import type { SavedGameRecord, WorkspacePayload } from "../../src/types/messages";

export type ThemeId = "classic" | "green" | "blue" | "dark" | "purple";
export type PieceSetId = "classic" | "neo" | "alpha" | "wood";
export type GameMode = "human" | "computer";
export type Difficulty = "easy" | "medium" | "hard";
export type Orientation = "white" | "black";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  boardLight: string;
  boardDark: string;
  background: string;
  sidebar: string;
  accent: string;
  text: string;
  panel: string;
}

export interface ChessSettings {
  theme: ThemeId;
  pieceSet: PieceSetId;
  animationSpeed: number;
  showCoordinates: boolean;
  sounds: boolean;
  autoSave: boolean;
  autoFlipBoard: boolean;
  showLegalMoves: boolean;
}

export interface OpeningLine {
  name: string;
  eco: string;
  sanMoves: string[];
  popularity: string;
  winRate: string;
}

export interface PersistedCurrentState {
  mode: GameMode;
  view: "board" | "saved" | "recent" | "settings";
  initialFen: string;
  moves: string[];
  cursor: number;
  orientation: Orientation;
  currentGameId: string | null;
  settings: ChessSettings;
  computerColor: "w" | "b";
  difficulty: Difficulty;
  whiteMs: number;
  blackMs: number;
}

export interface SavedGame extends SavedGameRecord {
  initialFen: string;
  moves: string[];
  cursor: number;
  orientation: Orientation;
  whiteMs: number;
  blackMs: number;
  computerColor: "w" | "b";
  difficulty: Difficulty;
}

export interface WorkspaceState extends WorkspacePayload {
  currentState: PersistedCurrentState | null;
  savedGames: SavedGame[];
  recentGames: SavedGame[];
  settings: ChessSettings;
}

// Search depth per difficulty. Kept shallow so the computer responds fast.
export const DIFFICULTY_DEPTH: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3
};
