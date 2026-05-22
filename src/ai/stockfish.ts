// AI integration notes and small wrapper placeholder.

export async function initStockfish() {
  // Options:
  // - Use Stockfish WASM build and load it via expo-asset + WebView or fetch.
  // - Or run Stockfish on a server and call it via REST/WS.
  // This file is a placeholder for the app-side API.

  return {
    name: "stockfish-placeholder",
    async analyze(fen: string) {
      // return a fake move for now
      return { bestmove: "e2e4", info: "placeholder" };
    },
  };
}
