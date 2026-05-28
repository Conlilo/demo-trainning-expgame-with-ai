import React, { useEffect, useState } from "react";
import { BackHandler } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import HomeScreen from "./src/screens/HomeScreen";
import BoardgameListScreen from "./src/screens/BoardgameListScreen";
import LogicGameListScreen from "./src/screens/LogicGameListScreen";
import ToolListScreen from "./src/screens/ToolListScreen";
import ToolGameScreen from "./src/screens/ToolGameScreen";
import UnoScreen from "./src/games/uno/UnoScreen";
import MaSoiScreen from "./src/games/masoi";
import ChessScreen from "./src/games/chess/ChessScreen";
import XiangqiScreen from "./src/games/xiangqi/XiangqiScreen";
import SudokuScreen from "./src/games/sudoku/SudokuScreen";
import QueensScreen from "./src/games/queens/QueensScreen";

type Route =
  | { name: "home" }
  | { name: "boardgame" }
  | { name: "tool" }
  | { name: "logic" }
  | { name: "chess" }
  | { name: "xiangqi" }
  | { name: "sudoku" }
  | { name: "queens" }
  | { name: "tool-game"; gameId: string }
  | { name: "play-session"; gameId: string };

export default function App() {
  const [stack, setStack] = useState<Route[]>([{ name: "home" }]);
  // Mode toggle for the Tool screens is shared between the detail and
  // session screens, keyed by gameId.
  const [aiModes, setAiModes] = useState<Record<string, boolean>>({});

  const current = stack[stack.length - 1];
  const push = (r: Route) => setStack((s) => [...s, r]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));

  const getAi = (id: string): boolean => aiModes[id] ?? false;
  const setAi = (id: string, value: boolean): void =>
    setAiModes((m) => ({ ...m, [id]: value }));

  // Android hardware back walks the stack; only the home screen lets the
  // system handle back (which exits the app).
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stack.length <= 1) return false;
      pop();
      return true;
    });
    return () => sub.remove();
  }, [stack.length]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {renderRoute(current, { push, pop, getAi, setAi })}
    </SafeAreaProvider>
  );
}

type Nav = {
  push: (r: Route) => void;
  pop: () => void;
  getAi: (id: string) => boolean;
  setAi: (id: string, v: boolean) => void;
};

function renderRoute(route: Route, nav: Nav): React.ReactNode {
  switch (route.name) {
    case "home":
      return <HomeScreen onSelectFolder={(folder) => nav.push({ name: folder })} />;
    case "boardgame":
      return (
        <BoardgameListScreen
          onBack={nav.pop}
          onSelectGame={(game) => nav.push({ name: game })}
        />
      );
    case "tool":
      return (
        <ToolListScreen
          onBack={nav.pop}
          onSelectGame={(gameId) => nav.push({ name: "tool-game", gameId })}
        />
      );
    case "logic":
      return (
        <LogicGameListScreen
          onBack={nav.pop}
          onSelectGame={(game) => nav.push({ name: game })}
        />
      );
    case "chess":
      return <ChessScreen onBack={nav.pop} />;
    case "xiangqi":
      return <XiangqiScreen onBack={nav.pop} />;
    case "sudoku":
      return <SudokuScreen onBack={nav.pop} />;
    case "queens":
      return <QueensScreen onBack={nav.pop} />;
    case "tool-game":
      return (
        <ToolGameScreen
          gameId={route.gameId}
          onBack={nav.pop}
          aiMode={nav.getAi(route.gameId)}
          onAiModeChange={(v) => nav.setAi(route.gameId, v)}
          onStartSession={() =>
            nav.push({ name: "play-session", gameId: route.gameId })
          }
        />
      );
    case "play-session":
      if (route.gameId === "masoi") {
        return <MaSoiScreen gameId={route.gameId} onBack={nav.pop} />;
      }
      return (
        <UnoScreen
          gameId={route.gameId}
          onBack={nav.pop}
          aiMode={nav.getAi(route.gameId)}
          onAiModeChange={(v) => nav.setAi(route.gameId, v)}
        />
      );
  }
}
