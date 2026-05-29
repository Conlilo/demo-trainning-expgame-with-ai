import React, { createContext, useContext, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen, { Folder } from "./src/screens/HomeScreen";
import BoardgameListScreen from "./src/screens/BoardgameListScreen";
import LogicGameListScreen from "./src/screens/LogicGameListScreen";
import ToolListScreen from "./src/screens/ToolListScreen";
import ToolGameScreen from "./src/screens/ToolGameScreen";
import UnoScreen from "./src/games/uno/UnoScreen";
import MaSoiScreen from "./src/games/masoi";
import ChessScreen from "./src/games/chess/ChessScreen";
import XiangqiScreen from "./src/games/xiangqi/XiangqiScreen";
import SplendorScreen from "./src/games/splendor/SplendorScreen";
import SudokuScreen from "./src/games/sudoku/SudokuScreen";
import QueensScreen from "./src/games/queens/QueensScreen";
import { RootStackParamList, RootStackProps } from "./src/navigation/types";

// ---------------------------------------------------------------------------
// Shared "AI thực thi" mode, keyed by gameId. The toggle lives on the Tool
// detail screen but must stay in sync with the play-session screen, so it is
// hoisted into context rather than passed through navigation params.
// ---------------------------------------------------------------------------
type AiModeContextValue = {
  getAi: (id: string) => boolean;
  setAi: (id: string, value: boolean) => void;
};

const AiModeContext = createContext<AiModeContextValue | null>(null);

function useAiMode(gameId: string): [boolean, (value: boolean) => void] {
  const ctx = useContext(AiModeContext);
  if (!ctx) throw new Error("useAiMode must be used within AiModeProvider");
  return [ctx.getAi(gameId), (value) => ctx.setAi(gameId, value)];
}

// Maps the home folder ids to their (param-less) route names.
const FOLDER_ROUTE: Record<Folder, "Boardgame" | "Tool" | "Logic"> = {
  boardgame: "Boardgame",
  tool: "Tool",
  logic: "Logic",
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: "#262421" },
};

export default function App() {
  const [aiModes, setAiModes] = useState<Record<string, boolean>>({});

  const aiCtx = useMemo<AiModeContextValue>(
    () => ({
      getAi: (id) => aiModes[id] ?? false,
      setAi: (id, value) => setAiModes((m) => ({ ...m, [id]: value })),
    }),
    [aiModes]
  );

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AiModeContext.Provider value={aiCtx}>
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Home" component={HomeRoute} />
            <Stack.Screen name="Boardgame" component={BoardgameRoute} />
            <Stack.Screen name="Tool" component={ToolRoute} />
            <Stack.Screen name="Logic" component={LogicRoute} />
            <Stack.Screen name="Chess" component={ChessRoute} />
            <Stack.Screen name="Xiangqi" component={XiangqiRoute} />
            <Stack.Screen name="Splendor" component={SplendorRoute} />
            <Stack.Screen name="Sudoku" component={SudokuRoute} />
            <Stack.Screen name="Queens" component={QueensRoute} />
            <Stack.Screen name="ToolGame" component={ToolGameRoute} />
            <Stack.Screen name="PlaySession" component={PlaySessionRoute} />
          </Stack.Navigator>
        </NavigationContainer>
      </AiModeContext.Provider>
    </SafeAreaProvider>
  );
}

// ---------------------------------------------------------------------------
// Route wrappers — adapt navigation/route onto each screen's existing prop API
// so the screen components themselves stay navigation-agnostic.
// ---------------------------------------------------------------------------

function HomeRoute({ navigation }: RootStackProps<"Home">) {
  return (
    <HomeScreen onSelectFolder={(folder) => navigation.navigate(FOLDER_ROUTE[folder])} />
  );
}

function BoardgameRoute({ navigation }: RootStackProps<"Boardgame">) {
  return (
    <BoardgameListScreen
      onBack={navigation.goBack}
      onSelectGame={(game) =>
        navigation.navigate(
          game === "chess" ? "Chess" : game === "xiangqi" ? "Xiangqi" : "Splendor"
        )
      }
    />
  );
}

function ToolRoute({ navigation }: RootStackProps<"Tool">) {
  return (
    <ToolListScreen
      onBack={navigation.goBack}
      onSelectGame={(gameId) => navigation.navigate("ToolGame", { gameId })}
    />
  );
}

function LogicRoute({ navigation }: RootStackProps<"Logic">) {
  return (
    <LogicGameListScreen
      onBack={navigation.goBack}
      onSelectGame={(game) => navigation.navigate(game === "sudoku" ? "Sudoku" : "Queens")}
    />
  );
}

function ChessRoute({ navigation }: RootStackProps<"Chess">) {
  return <ChessScreen onBack={navigation.goBack} />;
}

function XiangqiRoute({ navigation }: RootStackProps<"Xiangqi">) {
  return <XiangqiScreen onBack={navigation.goBack} />;
}

function SplendorRoute({ navigation }: RootStackProps<"Splendor">) {
  return <SplendorScreen onBack={navigation.goBack} />;
}

function SudokuRoute({ navigation }: RootStackProps<"Sudoku">) {
  return <SudokuScreen onBack={navigation.goBack} />;
}

function QueensRoute({ navigation }: RootStackProps<"Queens">) {
  return <QueensScreen onBack={navigation.goBack} />;
}

function ToolGameRoute({ navigation, route }: RootStackProps<"ToolGame">) {
  const { gameId } = route.params;
  const [aiMode, setAiMode] = useAiMode(gameId);
  return (
    <ToolGameScreen
      gameId={gameId}
      onBack={navigation.goBack}
      aiMode={aiMode}
      onAiModeChange={setAiMode}
      onStartSession={() => navigation.navigate("PlaySession", { gameId })}
    />
  );
}

function PlaySessionRoute({ navigation, route }: RootStackProps<"PlaySession">) {
  const { gameId } = route.params;
  const [aiMode, setAiMode] = useAiMode(gameId);

  if (gameId === "masoi") {
    return <MaSoiScreen gameId={gameId} onBack={navigation.goBack} />;
  }
  return (
    <UnoScreen
      gameId={gameId}
      onBack={navigation.goBack}
      aiMode={aiMode}
      onAiModeChange={setAiMode}
    />
  );
}
