import type { SavedGameRecord, WorkspacePayload } from "../../src/types/messages";

export type ThemeId = "classic" | "green" | "blue" | "dark" | "purple";
export type PieceSetId = "classic" | "neo" | "alpha" | "wood";
export type GameMode = "human" | "computer" | "analysis" | "puzzle";
export type Difficulty =
  | "beginner"
  | "easy"
  | "intermediate"
  | "advanced"
  | "expert"
  | "maximum";
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
  engineDepth: number;
  autoSave: boolean;
  autoFlipBoard: boolean;
  showLegalMoves: boolean;
  showEvaluationBar: boolean;
}

export interface EngineLine {
  move: string;
  san: string;
  pv: string[];
  score: number;
  depth: number;
}

export interface OpeningLine {
  name: string;
  eco: string;
  sanMoves: string[];
  popularity: string;
  winRate: string;
}

export interface PuzzleLine {
  id: string;
  rating: number;
  fen: string;
  solution: string[];
  hint: string;
  title: string;
}

export interface PersistedCurrentState {
  mode: GameMode;
  view: "board" | "saved" | "recent" | "settings" | "puzzles";
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
  puzzleIndex: number;
  puzzleStreak: number;
}

export interface SavedGame extends SavedGameRecord {
  initialFen: string;
  moves: string[];
  cursor: number;
  orientation: Orientation;
  whiteMs: number;
  blackMs: number;
  difficulty: Difficulty;
  computerColor: "w" | "b";
}

export interface WorkspaceState extends WorkspacePayload {
  currentState: PersistedCurrentState | null;
  savedGames: SavedGame[];
  recentGames: SavedGame[];
  settings: ChessSettings;
}
