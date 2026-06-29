import * as vscode from "vscode";

import { SavedGameRecord, WorkspacePayload } from "../types/messages";

const STORAGE_KEY = "chess.workspace";

const defaultPayload: WorkspacePayload = {
  currentState: null,
  savedGames: [],
  recentGames: [],
  settings: {}
};

export async function readWorkspacePayload(
  context: vscode.ExtensionContext
): Promise<WorkspacePayload> {
  return context.globalState.get<WorkspacePayload>(STORAGE_KEY, defaultPayload);
}

export async function writeWorkspacePayload(
  context: vscode.ExtensionContext,
  payload: WorkspacePayload
): Promise<void> {
  await context.globalState.update(STORAGE_KEY, payload);
}

export function mergeRecentGames(
  recentGames: SavedGameRecord[],
  game: SavedGameRecord
): SavedGameRecord[] {
  const withoutExisting = recentGames.filter((entry) => entry.id !== game.id);
  return [game, ...withoutExisting].slice(0, 12);
}
