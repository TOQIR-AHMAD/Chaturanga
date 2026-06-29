import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  WorkspacePayload
} from "../types/messages";
import { getNonce } from "../utils/getNonce";

export class ChessPanel {
  public static current: ChessPanel | undefined;

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly onMessage: (
      message: WebviewToExtensionMessage
    ) => Promise<void> | void
  ) {
    this.panel.onDidDispose(() => {
      if (ChessPanel.current === this) {
        ChessPanel.current = undefined;
      }
    });

    this.panel.webview.onDidReceiveMessage(async (message) => {
      await this.onMessage(message as WebviewToExtensionMessage);
    });

    this.panel.webview.html = this.render();
  }

  static createOrShow(
    extensionUri: vscode.Uri,
    onMessage: (
      message: WebviewToExtensionMessage
    ) => Promise<void> | void
  ): ChessPanel {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (ChessPanel.current) {
      ChessPanel.current.panel.reveal(column);
      return ChessPanel.current;
    }

    const panel = vscode.window.createWebviewPanel(
      "chess.board",
      "Chess.com for VS Code",
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "webview-ui", "dist"),
          vscode.Uri.joinPath(extensionUri, "media")
        ]
      }
    );

    ChessPanel.current = new ChessPanel(panel, extensionUri, onMessage);
    return ChessPanel.current;
  }

  reveal(): void {
    this.panel.reveal();
  }

  postMessage(message: ExtensionToWebviewMessage): Thenable<boolean> {
    return this.panel.webview.postMessage(message);
  }

  hydrate(payload: WorkspacePayload): Thenable<boolean> {
    return this.postMessage({
      type: "hydrate",
      payload
    });
  }

  private render(): string {
    const distPath = path.join(
      this.extensionUri.fsPath,
      "webview-ui",
      "dist",
      "assets"
    );
    const fallbackHtml = this.renderMissingBuild();

    if (!fs.existsSync(distPath)) {
      return fallbackHtml;
    }

    const assetFiles = fs.readdirSync(distPath);
    const scriptName = assetFiles.find(
      (file) => file.startsWith("index-") && file.endsWith(".js")
    );
    const styleName = assetFiles.find(
      (file) => file.startsWith("index-") && file.endsWith(".css")
    );

    if (!scriptName || !styleName) {
      return fallbackHtml;
    }

    const webview = this.panel.webview;
    const nonce = getNonce();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "webview-ui", "dist", "assets", scriptName)
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "webview-ui", "dist", "assets", styleName)
    );
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} https: data:`,
      `font-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `worker-src ${webview.cspSource} blob:`
    ].join("; ");

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <title>Chess.com for VS Code</title>
    <link rel="stylesheet" href="${styleUri}" />
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}">
      window.__CHESS_MEDIA_BASE__ = "${webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, "media")
      )}";
    </script>
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
  }

  private renderMissingBuild(): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        margin: 0;
        font-family: system-ui, sans-serif;
        background: #262522;
        color: #ffffff;
        display: grid;
        min-height: 100vh;
        place-items: center;
      }
      .card {
        max-width: 560px;
        padding: 24px;
        border-radius: 16px;
        background: #312e2b;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
      }
      code {
        color: #81b64c;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Webview bundle not found</h1>
      <p>Build the frontend before launching the extension:</p>
      <p><code>npm install</code></p>
      <p><code>npm --prefix webview-ui install</code></p>
      <p><code>npm run build</code></p>
    </div>
  </body>
</html>`;
  }
}
