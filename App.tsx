import React, { useEffect, useState } from "react";
import { BackHandler } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import HomeScreen from "./src/screens/HomeScreen";
import BoardgameListScreen from "./src/screens/BoardgameListScreen";
import ToolListScreen from "./src/screens/ToolListScreen";
import ToolGameScreen from "./src/screens/ToolGameScreen";
import PlaySessionScreen from "./src/screens/PlaySessionScreen";
import MaSoiSessionScreen from "./src/screens/MaSoiSessionScreen";
import ChessScreen from "./src/screens/ChessScreen";
import XiangqiScreen from "./src/screens/XiangqiScreen";

type Route =
  | { name: "home" }
  | { name: "boardgame" }
  | { name: "tool" }
  | { name: "chess" }
  | { name: "xiangqi" }
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
    case "chess":
      return <ChessScreen onBack={nav.pop} />;
    case "xiangqi":
      return <XiangqiScreen onBack={nav.pop} />;
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
        return <MaSoiSessionScreen gameId={route.gameId} onBack={nav.pop} />;
      }
      return (
        <PlaySessionScreen
          gameId={route.gameId}
          onBack={nav.pop}
          aiMode={nav.getAi(route.gameId)}
          onAiModeChange={(v) => nav.setAi(route.gameId, v)}
        />
      );
  }
}
