export type ChessView =
  | "board"
  | "saved"
  | "recent"
  | "settings"
  | "puzzles";

export type ExternalCommand =
  | "newGame"
  | "flipBoard"
  | "undo"
  | "redo"
  | "importPgn"
  | "loadFen"
  | "resumeGame"
  | "copyFenRequest"
  | "requestExportPgn"
  | "openSettings";

export interface SavedGameRecord {
  id: string;
  name: string;
  mode: string;
  pgn: string;
  fen: string;
  createdAt: string;
  updatedAt: string;
  result: string;
  opening?: string;
}

export interface WorkspacePayload {
  currentState: unknown | null;
  savedGames: SavedGameRecord[];
  recentGames: SavedGameRecord[];
  settings: unknown;
}

export type ExtensionToWebviewMessage =
  | {
      type: "hydrate";
      payload: WorkspacePayload;
    }
  | {
      type: "command";
      command: ExternalCommand;
      payload?: unknown;
    };

export type WebviewToExtensionMessage =
  | {
      type: "ready";
    }
  | {
      type: "persist";
      payload: WorkspacePayload;
    }
  | {
      type: "exportPgn";
      payload: {
        name: string;
        pgn: string;
      };
    }
  | {
      type: "copyText";
      payload: {
        value: string;
        label: "FEN" | "PGN";
      };
    }
  | {
      type: "notify";
      payload: {
        message: string;
      };
    };
