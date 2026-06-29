import * as vscode from "vscode";

interface ChessTreeItem {
  id: string;
  label: string;
  command: string;
  description: string;
}

const items: ChessTreeItem[] = [
  {
    id: "new-game",
    label: "New Game",
    command: "chess.newGame",
    description: "Start a fresh local game"
  },
  {
    id: "resume-game",
    label: "Resume Game",
    command: "chess.resumeGame",
    description: "Continue the current saved board"
  },
  {
    id: "analysis-board",
    label: "Analysis Board",
    command: "chess.openAnalysisBoard",
    description: "Open free analysis mode"
  },
  {
    id: "saved-games",
    label: "Saved Games",
    command: "chess.openBoard",
    description: "Browse local PGN saves"
  },
  {
    id: "settings",
    label: "Settings",
    command: "chess.openSettings",
    description: "Adjust board and engine preferences"
  },
  {
    id: "recent-games",
    label: "Recent Games",
    command: "chess.openBoard",
    description: "Reopen recent positions"
  }
];

export class ChessActivityProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private readonly onDidChangeTreeDataEmitter =
    new vscode.EventEmitter<void>();

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  getTreeItem(item: vscode.TreeItem): vscode.TreeItem {
    return item;
  }

  getChildren(): vscode.ProviderResult<vscode.TreeItem[]> {
    return items.map((item) => {
      const treeItem = new vscode.TreeItem(
        item.label,
        vscode.TreeItemCollapsibleState.None
      );
      treeItem.id = item.id;
      treeItem.description = item.description;
      treeItem.command = {
        command: item.command,
        title: item.label
      };
      return treeItem;
    });
  }
}
