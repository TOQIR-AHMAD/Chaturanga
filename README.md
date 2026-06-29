<div align="center">
  <h1>Chaturanga</h1>
  <p><strong>Chess.com-inspired chess for VS Code.</strong></p>
  <p>
    Play, analyze, and resume chess games directly inside Visual Studio Code with an offline-first experience built on a custom webview UI.
  </p>
</div>

<br />

<table>
  <tr>
    <td width="33%" valign="top">
      <h3>Play</h3>
      <p>Start local human vs human or human vs computer games with a smooth board interface, move history, clocks, sounds, and save support.</p>
    </td>
    <td width="33%" valign="top">
      <h3>Analyze</h3>
      <p>Open an analysis board, import FEN or PGN, inspect engine lines, edit positions, and review openings without leaving the editor.</p>
    </td>
    <td width="33%" valign="top">
      <h3>Restore</h3>
      <p>Persist current sessions, saved games, recent games, and preferences through local storage and VS Code global state.</p>
    </td>
  </tr>
</table>

## Overview

Chaturanga is a production-ready VS Code extension designed for chess players who want a polished in-editor experience. It combines a TypeScript extension backend with a React, Vite, TailwindCSS, and Zustand-powered webview frontend to deliver interactive chess features in a desktop-friendly layout.

## Core Features

<ul>
  <li>Offline human vs human chess</li>
  <li>Offline human vs computer mode with a worker-based engine</li>
  <li>Analysis board with FEN and PGN import and export</li>
  <li>Puzzle mode with bundled positions</li>
  <li>Saved games and recent games management</li>
  <li>Session restore across VS Code restarts</li>
  <li>Chess.com and Lichess import helpers</li>
  <li>Activity bar integration and command palette support</li>
</ul>

## Commands

<table>
  <tr>
    <th align="left">Command</th>
    <th align="left">Purpose</th>
  </tr>
  <tr><td><code>Chess: Open Board</code></td><td>Open the main chess interface.</td></tr>
  <tr><td><code>Chess: New Game</code></td><td>Start a fresh game.</td></tr>
  <tr><td><code>Chess: Flip Board</code></td><td>Toggle board orientation.</td></tr>
  <tr><td><code>Chess: Undo Move</code></td><td>Step backward through move history.</td></tr>
  <tr><td><code>Chess: Redo Move</code></td><td>Step forward through move history.</td></tr>
  <tr><td><code>Chess: Analyze Position</code></td><td>Open analysis tools for the current position.</td></tr>
  <tr><td><code>Chess: Export PGN</code></td><td>Export the current game as PGN.</td></tr>
  <tr><td><code>Chess: Import PGN</code></td><td>Load a PGN into the board.</td></tr>
  <tr><td><code>Chess: Copy FEN</code></td><td>Copy the current FEN to the clipboard.</td></tr>
  <tr><td><code>Chess: Paste FEN</code></td><td>Load a FEN from the clipboard.</td></tr>
  <tr><td><code>Chess: Open Settings</code></td><td>Open in-extension preferences.</td></tr>
  <tr><td><code>Chess: Resume Game</code></td><td>Resume a saved or recent game.</td></tr>
  <tr><td><code>Chess: Open Analysis Board</code></td><td>Launch the dedicated analysis board.</td></tr>
</table>

## Architecture

```text
chess-vscode/
|- src/              VS Code extension backend
|- webview-ui/       React + Vite webview application
|- media/            icons and sound assets
|- tests/            unit and state tests
|- docs/             installation and packaging guides
```

## Technology Stack

<ul>
  <li>TypeScript</li>
  <li>VS Code Extension API</li>
  <li>React</li>
  <li>Vite</li>
  <li>TailwindCSS</li>
  <li>Zustand</li>
  <li>chess.js</li>
  <li>React DnD</li>
  <li>Web Workers</li>
</ul>

## Development

### Install

```bash
npm install
```

### Build

```bash
npm run build
```

### Run in Watch Mode

```bash
npm run dev
```

### Test

```bash
npm test
```

### Package the Extension

```bash
npm run package
```

## Persistence Model

Chaturanga stores board state, saved games, recent games, and preferences in two layers:

<ul>
  <li><strong>Webview localStorage</strong> for fast UI restoration</li>
  <li><strong>VS Code globalState</strong> for extension-level persistence</li>
</ul>

## Notes

<ul>
  <li>Online import features require network access during runtime.</li>
  <li>The packaged VSIX is generated successfully from this workspace.</li>
  <li>The webview bundle must exist before launching the extension outside watch mode.</li>
</ul>

# Chaturanga
