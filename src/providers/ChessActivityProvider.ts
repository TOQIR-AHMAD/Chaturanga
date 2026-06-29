import * as vscode from "vscode";

import { getNonce } from "../utils/getNonce";

interface ActionButton {
  command: string;
  label: string;
  description: string;
  primary?: boolean;
}

const actions: ActionButton[] = [
  {
    command: "chess.newGame",
    label: "New Game",
    description: "Start a fresh local game",
    primary: true
  },
  {
    command: "chess.openAnalysisBoard",
    label: "Analysis Board",
    description: "Explore positions freely"
  },
  {
    command: "chess.resumeGame",
    label: "Resume Game",
    description: "Continue a saved board"
  },
  {
    command: "chess.importPGN",
    label: "Import PGN",
    description: "Load a game from a file"
  },
  {
    command: "chess.openSettings",
    label: "Settings",
    description: "Board, pieces, and engine"
  }
];

const howToPlay: string[] = [
  "Click <strong>New Game</strong> to open the board in the editor.",
  "Drag or click a piece, then click a highlighted square to move.",
  "Use the side panel to flip the board, undo, redo, or analyze.",
  "Switch to <strong>Analysis Board</strong> to study any position.",
  "Save anytime — your game is restored when you reopen VS Code."
];

export class ChessActivityProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "chess.activity";

  private view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")]
    };

    webviewView.webview.html = this.render(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message) => {
      if (message?.type === "run" && typeof message.command === "string") {
        void vscode.commands.executeCommand(message.command);
      }
    });
  }

  private render(webview: vscode.Webview): string {
    const nonce = getNonce();
    const iconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "icon.png")
    );
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} https: data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`
    ].join("; ");

    const buttons = actions
      .map(
        (action) => `
        <button class="action ${action.primary ? "primary" : ""}" data-command="${action.command}">
          <span class="action-label">${action.label}</span>
          <span class="action-desc">${action.description}</span>
        </button>`
      )
      .join("");

    const steps = howToPlay
      .map((step) => `<li>${step}</li>`)
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        margin: 0;
        padding: 12px 12px 20px;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        color: var(--vscode-foreground);
      }
      .hero {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 16px;
      }
      .hero img {
        width: 40px;
        height: 40px;
        border-radius: 8px;
      }
      .hero h1 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 600;
      }
      .hero p {
        margin: 2px 0 0;
        font-size: 0.78rem;
        opacity: 0.75;
      }
      .actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .action {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        width: 100%;
        padding: 8px 10px;
        border: 1px solid var(--vscode-widget-border, transparent);
        border-radius: 6px;
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        cursor: pointer;
        text-align: left;
        font-family: inherit;
      }
      .action:hover {
        background: var(--vscode-button-secondaryHoverBackground);
      }
      .action.primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border-color: transparent;
      }
      .action.primary:hover {
        background: var(--vscode-button-hoverBackground);
      }
      .action-label {
        font-weight: 600;
        font-size: 0.85rem;
      }
      .action-desc {
        font-size: 0.72rem;
        opacity: 0.8;
      }
      .section-title {
        margin: 20px 0 8px;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0.65;
      }
      ol.how {
        margin: 0;
        padding-left: 18px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      ol.how li {
        font-size: 0.78rem;
        line-height: 1.35;
      }
      .shortcuts {
        margin-top: 6px;
        border-top: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.25));
        padding-top: 10px;
      }
      .shortcut {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        padding: 3px 0;
      }
      .shortcut kbd {
        font-family: var(--vscode-editor-font-family, monospace);
        background: var(--vscode-keybindingLabel-background, rgba(128,128,128,0.17));
        color: var(--vscode-keybindingLabel-foreground, inherit);
        border: 1px solid var(--vscode-keybindingLabel-border, transparent);
        border-radius: 4px;
        padding: 1px 5px;
        font-size: 0.7rem;
      }
    </style>
  </head>
  <body>
    <div class="hero">
      <img src="${iconUri}" alt="Chaturanga" />
      <div>
        <h1>Chaturanga</h1>
        <p>Play &amp; analyze chess in VS Code</p>
      </div>
    </div>

    <div class="actions">
      ${buttons}
    </div>

    <div class="section-title">How to play</div>
    <ol class="how">
      ${steps}
    </ol>

    <div class="section-title">Shortcuts (when board is focused)</div>
    <div class="shortcuts">
      <div class="shortcut"><span>New game</span><kbd>Ctrl/Cmd+Alt+N</kbd></div>
      <div class="shortcut"><span>Undo move</span><kbd>Ctrl/Cmd+Z</kbd></div>
      <div class="shortcut"><span>Redo move</span><kbd>Ctrl+Y / Cmd+Shift+Z</kbd></div>
      <div class="shortcut"><span>Flip board</span><kbd>Ctrl/Cmd+Alt+F</kbd></div>
    </div>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      for (const button of document.querySelectorAll(".action")) {
        button.addEventListener("click", () => {
          vscode.postMessage({ type: "run", command: button.dataset.command });
        });
      }
    </script>
  </body>
</html>`;
  }
}
