<div align="center">
  <h1>Chaturanga</h1>
  <p><strong>Chess inside VS Code</strong></p>
  <p>Play, analyze, and manage games directly in your editor.</p>
</div>

## Overview

Chaturanga is a VS Code extension that provides an offline-first chess experience using a webview-based UI built with React and modern web technologies.

## What It Does

- Play chess locally in human vs human mode
- Play against a computer engine offline
- Analyze positions using FEN and PGN
- Import and export games
- Resume saved games and sessions
- Undo and redo moves
- Flip board orientation
- Copy and paste FEN positions

## Modes

- **Play**: Real-time chess with move history and save support
- **Analyze**: Study positions using FEN/PGN and engine lines
- **Puzzle**: Solve built-in chess puzzles

## Commands

| Command | Purpose |
| --- | --- |
| `Chess: Open Board` | Open the main chess interface |
| `Chess: New Game` | Start a fresh game |
| `Chess: Flip Board` | Toggle board orientation |
| `Chess: Undo Move` | Step backward through move history |
| `Chess: Redo Move` | Step forward through move history |
| `Chess: Analyze Position` | Open analysis tools for the current position |
| `Chess: Export PGN` | Export the current game as PGN |
| `Chess: Import PGN` | Load a PGN into the board |
| `Chess: Copy FEN` | Copy the current FEN to the clipboard |
| `Chess: Paste FEN` | Load a FEN from the clipboard |
| `Chess: Resume Game` | Resume a saved or recent game |
| `Chess: Open Analysis Board` | Launch the dedicated analysis board |
| `Chess: Open Settings` | Open in-extension preferences |

## Architecture

```text
src/           Extension backend
webview-ui/    React frontend
media/         Assets
tests/         Unit tests
docs/          Documentation
```

## Tech Stack

- TypeScript
- VS Code Extension API
- React + Vite
- Zustand
- TailwindCSS
- chess.js
- Web Workers

## Persistence

- VS Code `globalState` for saved games, sessions, and settings
- Webview `localStorage` for fast UI restore

## Notes

- Online import features require network access during runtime.
- The webview bundle must exist before launching the extension outside watch mode.
- The packaged VSIX is generated successfully from this workspace.
