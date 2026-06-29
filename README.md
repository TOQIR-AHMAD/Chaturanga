<div align="center">
  <h1>Chaturanga</h1>
  <p><strong>Play chess inside VS Code</strong></p>
  <p>A fast, offline chess board right in your editor.</p>
</div>

## Overview

Chaturanga is a VS Code extension for playing chess without leaving your editor. Open the board from the Chess activity bar and play a friend on the same screen or take on a built-in computer opponent — all offline.

## Features

- **Play with a Friend** — two players on the same board
- **Play vs Computer** — built-in offline opponent with Easy / Medium / Hard levels
- **Classic Staunton pieces** with multiple board themes
- **Undo / Redo**, board flip, and move history
- **Save & resume** games — your board is restored when you reopen VS Code
- **Import / export PGN** and copy / paste FEN
- Opening detection for the current position

## Getting Started

1. Click the **Chess** icon in the Activity Bar.
2. Press **New Game** to open the board.
3. In the board's toolbar, choose **Play a Friend** or **Play Computer**.
4. Drag or click a piece, then click a highlighted square to move.

## Commands

| Command | Purpose |
| --- | --- |
| `Chess: Open Board` | Open the chess board |
| `Chess: New Game` | Start a fresh game |
| `Chess: Flip Board` | Toggle board orientation |
| `Chess: Undo Move` | Step backward through moves |
| `Chess: Redo Move` | Step forward through moves |
| `Chess: Export PGN` | Export the current game as PGN |
| `Chess: Import PGN` | Load a PGN from a file |
| `Chess: Copy FEN` | Copy the current FEN |
| `Chess: Paste FEN` | Load a position from a FEN |
| `Chess: Resume Game` | Resume a saved game |
| `Chess: Open Settings` | Open in-board preferences |

## Keyboard Shortcuts

Active only while the chess board is focused:

| Action | Shortcut |
| --- | --- |
| New game | `Ctrl/Cmd+Alt+N` |
| Undo move | `Ctrl/Cmd+Z` |
| Redo move | `Ctrl+Y` / `Cmd+Shift+Z` |
| Flip board | `Ctrl/Cmd+Alt+F` |

## Tech Stack

- TypeScript · VS Code Extension API
- React + Vite · Zustand · TailwindCSS
- chess.js · Web Worker (computer opponent)

## Persistence

- VS Code `globalState` for saved games and settings
- Webview `localStorage` for fast UI restore

## Credits

- Chess pieces: classic Staunton set by **Colin M.L. Burnett** (the "cburnett" set), used under the BSD license.

## License

MIT — see [LICENSE](LICENSE).
