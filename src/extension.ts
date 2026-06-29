import * as fs from "node:fs/promises";
import * as vscode from "vscode";

import { ChessPanel } from "./panels/ChessPanel";
import { ChessActivityProvider } from "./providers/ChessActivityProvider";
import {
  ExternalCommand,
  WebviewToExtensionMessage,
  WorkspacePayload
} from "./types/messages";
import {
  mergeRecentGames,
  readWorkspacePayload,
  writeWorkspacePayload
} from "./utils/storage";

async function withPanel(
  context: vscode.ExtensionContext,
  callback?: (panel: ChessPanel) => Promise<void> | void
): Promise<ChessPanel> {
  const panel = ChessPanel.createOrShow(context.extensionUri, async (message) => {
    await handleWebviewMessage(context, message);
  });

  if (callback) {
    await callback(panel);
  }

  return panel;
}

async function showPgnOpenDialog(): Promise<string | undefined> {
  const selection = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: {
      "Portable Game Notation": ["pgn"],
      "Text files": ["txt"]
    },
    title: "Import PGN"
  });

  if (!selection?.length) {
    return undefined;
  }

  const content = await fs.readFile(selection[0].fsPath, "utf8");
  return content;
}

async function exportPgnToDisk(name: string, pgn: string): Promise<void> {
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(`${name || "game"}.pgn`),
    filters: {
      "Portable Game Notation": ["pgn"]
    },
    saveLabel: "Export PGN"
  });

  if (!uri) {
    return;
  }

  await fs.writeFile(uri.fsPath, pgn, "utf8");
  void vscode.window.showInformationMessage(`PGN exported to ${uri.fsPath}`);
}

async function handleWebviewMessage(
  context: vscode.ExtensionContext,
  message: WebviewToExtensionMessage
): Promise<void> {
  switch (message.type) {
    case "ready": {
      const payload = await readWorkspacePayload(context);
      await ChessPanel.current?.hydrate(payload);
      return;
    }
    case "persist": {
      await writeWorkspacePayload(context, message.payload);
      return;
    }
    case "exportPgn": {
      await exportPgnToDisk(message.payload.name, message.payload.pgn);
      return;
    }
    case "copyText": {
      await vscode.env.clipboard.writeText(message.payload.value);
      void vscode.window.showInformationMessage(
        `${message.payload.label} copied to clipboard`
      );
      return;
    }
    case "notify": {
      void vscode.window.showInformationMessage(message.payload.message);
      return;
    }
    default: {
      return;
    }
  }
}

async function postCommand(
  context: vscode.ExtensionContext,
  command: ExternalCommand,
  payload?: unknown
): Promise<void> {
  const panel = await withPanel(context);
  await panel.postMessage({ type: "command", command, payload });
}

async function resumeSavedGame(
  context: vscode.ExtensionContext,
  payload?: WorkspacePayload
): Promise<void> {
  const workspacePayload = payload ?? (await readWorkspacePayload(context));
  const picks = workspacePayload.savedGames.map((game) => ({
    label: game.name,
    description: `${game.mode} - ${new Date(game.updatedAt).toLocaleString()}`,
    detail: game.opening ?? game.result,
    game
  }));

  if (!picks.length) {
    void vscode.window.showInformationMessage("No saved games found.");
    await withPanel(context, async (panel) => {
      await panel.postMessage({ type: "command", command: "resumeGame" });
    });
    return;
  }

  const selection = await vscode.window.showQuickPick(picks, {
    title: "Resume saved game"
  });

  if (!selection) {
    return;
  }

  const nextRecentGames = mergeRecentGames(
    workspacePayload.recentGames,
    selection.game
  );
  const nextPayload = {
    ...workspacePayload,
    recentGames: nextRecentGames
  };
  await writeWorkspacePayload(context, nextPayload);
  await withPanel(context, async (panel) => {
    await panel.postMessage({
      type: "command",
      command: "resumeGame",
      payload: selection.game
    });
  });
}

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  const activityProvider = new ChessActivityProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChessActivityProvider.viewType,
      activityProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("chess.openBoard", async () => {
      await withPanel(context);
    }),
    vscode.commands.registerCommand("chess.newGame", async () => {
      await postCommand(context, "newGame");
    }),
    vscode.commands.registerCommand("chess.flipBoard", async () => {
      await postCommand(context, "flipBoard");
    }),
    vscode.commands.registerCommand("chess.undo", async () => {
      await postCommand(context, "undo");
    }),
    vscode.commands.registerCommand("chess.redo", async () => {
      await postCommand(context, "redo");
    }),
    vscode.commands.registerCommand("chess.exportPGN", async () => {
      await postCommand(context, "requestExportPgn");
    }),
    vscode.commands.registerCommand("chess.importPGN", async () => {
      const pgn = await showPgnOpenDialog();
      if (!pgn) {
        return;
      }

      await postCommand(context, "importPgn", { pgn });
    }),
    vscode.commands.registerCommand("chess.copyFEN", async () => {
      await postCommand(context, "copyFenRequest");
    }),
    vscode.commands.registerCommand("chess.pasteFEN", async () => {
      const fen = await vscode.env.clipboard.readText();
      await postCommand(context, "loadFen", { fen });
    }),
    vscode.commands.registerCommand("chess.openSettings", async () => {
      await withPanel(context, async (panel) => {
        await panel.postMessage({
          type: "command",
          command: "openSettings"
        });
      });
    }),
    vscode.commands.registerCommand("chess.resumeGame", async () => {
      await resumeSavedGame(context);
    })
  );
}

export function deactivate(): void {
  ChessPanel.current = undefined;
}
