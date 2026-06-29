import React from "react";
import ReactDOM from "react-dom/client";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import App from "./App";
import "./index.css";

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error("Chaturanga webview crashed:", error);
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            color: "#fff",
            background: "#262522",
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            textAlign: "center"
          }}
        >
          <div style={{ maxWidth: 480 }}>
            <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ opacity: 0.8, fontSize: "0.9rem" }}>
              The chess board failed to load. Try reopening it with
              <strong> Chess: Open Board</strong> from the Command Palette.
            </p>
            <pre
              style={{
                marginTop: 16,
                textAlign: "left",
                whiteSpace: "pre-wrap",
                fontSize: "0.75rem",
                opacity: 0.6
              }}
            >
              {this.state.error.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <DndProvider backend={HTML5Backend}>
        <App />
      </DndProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
