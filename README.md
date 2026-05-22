# AI Board Suite — demo-trainning-expgame-with-ai

Bộ ứng dụng React Native (Expo) TypeScript chứa các game bàn như cờ vua và cờ tướng, chơi với AI.

Quick start
1. Cài node/npm hoặc yarn, sau đó cài `expo-cli` nếu cần:

```bash
npm install -g expo-cli
```

2. Cài phụ thuộc và chạy app trong thư mục dự án:

```bash
npm install
npm run start
```

3. Mở trên thiết bị hoặc simulator bằng Expo Go hoặc `expo run:ios` / `expo run:android`.

What is included
- `App.tsx`: entry point với menu tới các game.
- `src/screens/ChessScreen.tsx` và `src/screens/XiangqiScreen.tsx`: màn hình placeholder.
- `src/components/BoardPlaceholder.tsx`: placeholder cho bàn cờ.
- `src/ai/stockfish.ts`: scaffold tích hợp AI (placeholder).

Next steps
- Thêm engine AI: Stockfish WASM (client) hoặc Stockfish server.
- Triển khai UI bàn cờ (ví dụ `chess.js`/`chessboardjsx` port hoặc custom).
- Thêm mạng lưới, lưu ván đấu, tính điểm, và lựa chọn difficulty.

If you want, I can now:
- Cấu hình Stockfish WASM integration
- Thêm thư viện chess logic (`chess.js`) và ví dụ chơi AI
- Thiết lập navigation (`react-navigation`) và state management

Hãy cho tôi biết bước bạn muốn tiếp theo.
