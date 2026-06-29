import * as vscode from "vscode";

import type { ExternalCommand, UiState } from "../types/messages";
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
    description: "Open the board and start playing",
    primary: true
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
    description: "Board theme"
  }
];

export class ChessActivityProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "chess.activity";

  private view?: vscode.WebviewView;
  private lastState?: UiState;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly onCommand: (command: ExternalCommand, payload?: unknown) => void
  ) {}

  updateState(state: UiState): void {
    this.lastState = state;
    void this.view?.webview.postMessage({ type: "uiState", payload: state });
  }

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
        return;
      }
      if (message?.type === "command" && typeof message.command === "string") {
        this.onCommand(message.command as ExternalCommand, message.payload);
      }
    });

    // Re-send the last known state when the view (re)appears.
    if (this.lastState) {
      this.updateState(this.lastState);
    }
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
        <button class="action ${action.primary ? "primary" : ""}" data-run="${action.command}">
          <span class="action-label">${action.label}</span>
          <span class="action-desc">${action.description}</span>
        </button>`
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <style>
      body {
        margin: 0;
        padding: 12px 12px 20px;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        color: var(--vscode-foreground);
      }
      .hero { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
      .hero img { width: 36px; height: 36px; border-radius: 8px; }
      .hero h1 { margin: 0; font-size: 1rem; font-weight: 600; }
      .hero p { margin: 2px 0 0; font-size: 0.75rem; opacity: 0.7; }
      .actions { display: flex; flex-direction: column; gap: 8px; }
      .action {
        display: flex; flex-direction: column; gap: 2px; width: 100%;
        padding: 7px 10px; border: 1px solid var(--vscode-widget-border, transparent);
        border-radius: 6px; background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground); cursor: pointer;
        text-align: left; font-family: inherit;
      }
      .action:hover { background: var(--vscode-button-secondaryHoverBackground); }
      .action.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-color: transparent; }
      .action.primary:hover { background: var(--vscode-button-hoverBackground); }
      .action-label { font-weight: 600; font-size: 0.85rem; }
      .action-desc { font-size: 0.72rem; opacity: 0.8; }
      .divider { height: 1px; background: var(--vscode-widget-border, rgba(128,128,128,0.25)); margin: 16px 0; }
      .section-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.6; margin: 0 0 8px; }
      .status { font-size: 0.85rem; margin-bottom: 10px; }
      .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      .stat { background: var(--vscode-textBlockQuote-background, rgba(128,128,128,0.12)); border-radius: 6px; padding: 6px 8px; }
      .stat .k { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.55; }
      .stat .v { font-size: 0.85rem; font-weight: 600; margin-top: 2px; }
      .row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
      .btn {
        flex: 1; min-width: 0; padding: 6px 8px; border-radius: 6px; cursor: pointer;
        border: 1px solid var(--vscode-widget-border, transparent);
        background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);
        font-family: inherit; font-size: 0.78rem;
      }
      .btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
      .btn.active { outline: 2px solid var(--vscode-focusBorder, #81B64C); }
      select.diff { width: 100%; margin-top: 6px; padding: 5px; border-radius: 6px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border, transparent); }
      .moves { max-height: 180px; overflow: auto; font-size: 0.78rem; }
      .moverow { display: grid; grid-template-columns: 22px 1fr 1fr; gap: 4px; padding: 2px 0; }
      .moverow .n { opacity: 0.5; }
      .captured .label { font-size: 0.7rem; opacity: 0.55; margin-top: 6px; }
      .empty { opacity: 0.5; font-size: 0.78rem; }
    </style>
  </head>
  <body>
    <div class="hero">
      <img src="${iconUri}" alt="Chaturanga" />
      <div>
        <h1>Chaturanga</h1>
        <p>Play chess in VS Code</p>
      </div>
    </div>

    <div class="actions">
      ${buttons}
    </div>

    <div class="divider"></div>

    <p class="section-title">Game</p>
    <div class="status" id="status">Open the board to start.</div>
    <div class="grid2">
      <div class="stat"><div class="k">Turn</div><div class="v" id="turn">—</div></div>
      <div class="stat"><div class="k">Result</div><div class="v" id="result">—</div></div>
      <div class="stat"><div class="k">White</div><div class="v" id="white">—</div></div>
      <div class="stat"><div class="k">Black</div><div class="v" id="black">—</div></div>
    </div>

    <div class="divider"></div>

    <p class="section-title">Mode</p>
    <div class="row">
      <button class="btn" id="mode-human" data-cmd="newHuman">Play a Friend</button>
      <button class="btn" id="mode-computer" data-cmd="newComputer">Play Computer</button>
    </div>
    <select class="diff" id="difficulty" style="display:none">
      <option value="easy">Easy</option>
      <option value="medium">Medium</option>
      <option value="hard">Hard</option>
    </select>

    <p class="section-title" style="margin-top:16px">Controls</p>
    <div class="row">
      <button class="btn" data-cmd="undo">Undo</button>
      <button class="btn" data-cmd="redo">Redo</button>
      <button class="btn" data-cmd="flipBoard">Flip</button>
      <button class="btn" data-cmd="save">Save</button>
    </div>

    <div class="divider"></div>

    <p class="section-title">Move History</p>
    <div class="moves" id="moves"><div class="empty">No moves yet.</div></div>

    <div class="divider"></div>

    <p class="section-title">Captured</p>
    <div class="captured">
      <div class="label">White</div>
      <div id="cap-white" class="empty">None</div>
      <div class="label">Black</div>
      <div id="cap-black" class="empty">None</div>
    </div>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();

      for (const button of document.querySelectorAll(".action")) {
        button.addEventListener("click", () => {
          vscode.postMessage({ type: "run", command: button.dataset.run });
        });
      }
      for (const button of document.querySelectorAll(".btn[data-cmd]")) {
        button.addEventListener("click", () => {
          vscode.postMessage({ type: "command", command: button.dataset.cmd });
        });
      }
      document.getElementById("difficulty").addEventListener("change", (event) => {
        vscode.postMessage({ type: "command", command: "setDifficulty", payload: { difficulty: event.target.value } });
      });

      function setText(id, value) { document.getElementById(id).textContent = value; }

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (!message || message.type !== "uiState") { return; }
        const s = message.payload;

        setText("status", s.status);
        setText("turn", s.turn);
        setText("result", s.result);
        setText("white", s.whiteClock);
        setText("black", s.blackClock);

        document.getElementById("mode-human").classList.toggle("active", s.mode === "human");
        document.getElementById("mode-computer").classList.toggle("active", s.mode === "computer");
        const diff = document.getElementById("difficulty");
        diff.style.display = s.mode === "computer" ? "block" : "none";
        diff.value = s.difficulty;

        const movesEl = document.getElementById("moves");
        if (!s.moves.length) {
          movesEl.innerHTML = '<div class="empty">No moves yet.</div>';
        } else {
          let html = "";
          for (let i = 0; i < s.moves.length; i += 2) {
            const w = s.moves[i] || "";
            const b = s.moves[i + 1] || "";
            html += '<div class="moverow"><span class="n">' + (i / 2 + 1) + '.</span><span>' + w + '</span><span>' + b + '</span></div>';
          }
          movesEl.innerHTML = html;
          movesEl.scrollTop = movesEl.scrollHeight;
        }

        const capWhite = document.getElementById("cap-white");
        const capBlack = document.getElementById("cap-black");
        capWhite.textContent = s.capturedWhite || "None";
        capBlack.textContent = s.capturedBlack || "None";
        capWhite.className = s.capturedWhite ? "" : "empty";
        capBlack.className = s.capturedBlack ? "" : "empty";
      });
    </script>
  </body>
</html>`;
  }
}
