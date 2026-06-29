import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  WorkspacePayload
} from "../../../src/types/messages";

declare global {
  interface Window {
    acquireVsCodeApi?: <T>() => {
      postMessage(message: T): void;
      setState(state: unknown): void;
      getState(): unknown;
    };
  }
}

const vscodeApi = window.acquireVsCodeApi?.<WebviewToExtensionMessage>();

export function postToExtension(message: WebviewToExtensionMessage): void {
  vscodeApi?.postMessage(message);
}

export function persistWorkspace(payload: WorkspacePayload): void {
  postToExtension({
    type: "persist",
    payload
  });
}

export function listenToExtension(
  callback: (message: ExtensionToWebviewMessage) => void
): () => void {
  const handler = (event: MessageEvent<ExtensionToWebviewMessage>) => {
    callback(event.data);
  };

  window.addEventListener("message", handler);
  return () => {
    window.removeEventListener("message", handler);
  };
}

export function signalReady(): void {
  postToExtension({ type: "ready" });
}
