<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Chaturanga</title>
</head>
<body>

  <header>
    <h1>Chaturanga</h1>
    <p>Chess inside VS Code - play, analyze, and manage games directly in your editor.</p>
  </header>

  <section>
    <h2>Overview</h2>
    <p>
      Chaturanga is a VS Code extension that provides an offline-first chess experience
      using a webview-based UI built with React and modern web technologies.
    </p>
  </section>

  <section>
    <h2>What it does</h2>
    <ul>
      <li>Play chess locally (human vs human)</li>
      <li>Play against a computer engine (offline)</li>
      <li>Analyze positions using FEN and PGN</li>
      <li>Import and export games</li>
      <li>Resume saved games and sessions</li>
      <li>Undo and redo moves</li>
      <li>Flip board orientation</li>
      <li>Copy and paste FEN positions</li>
    </ul>
  </section>

  <section>
    <h2>Modes</h2>
    <ul>
      <li><strong>Play:</strong> Real-time chess with move history and save support</li>
      <li><strong>Analyze:</strong> Study positions using FEN/PGN and engine lines</li>
      <li><strong>Puzzle:</strong> Solve built-in chess puzzles</li>
    </ul>
  </section>

  <section>
    <h2>Commands</h2>
    <ul>
      <li>Chess: Open Board</li>
      <li>Chess: New Game</li>
      <li>Chess: Flip Board</li>
      <li>Chess: Undo Move</li>
      <li>Chess: Redo Move</li>
      <li>Chess: Analyze Position</li>
      <li>Chess: Export PGN</li>
      <li>Chess: Import PGN</li>
      <li>Chess: Copy FEN</li>
      <li>Chess: Paste FEN</li>
      <li>Chess: Resume Game</li>
      <li>Chess: Open Analysis Board</li>
      <li>Chess: Open Settings</li>
    </ul>
  </section>

  <section>
    <h2>Architecture</h2>
    <pre>
src/           Extension backend
webview-ui/    React frontend
media/         Assets
tests/         Unit tests
docs/          Documentation
    </pre>
  </section>

  <section>
    <h2>Tech Stack</h2>
    <ul>
      <li>TypeScript</li>
      <li>VS Code Extension API</li>
      <li>React + Vite</li>
      <li>Zustand</li>
      <li>TailwindCSS</li>
      <li>chess.js</li>
      <li>Web Workers</li>
    </ul>
  </section>

  <section>
    <h2>Persistence</h2>
    <ul>
      <li>VS Code globalState (saved games, sessions, settings)</li>
      <li>Webview localStorage (fast UI restore)</li>
    </ul>
  </section>

  <footer>
    <p>Offline-first chess experience inside VS Code.</p>
  </footer>

</body>
</html>
