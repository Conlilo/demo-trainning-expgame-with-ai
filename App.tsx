import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import HomeScreen, { GameId } from "./src/screens/HomeScreen";
import ChessScreen from "./src/screens/ChessScreen";

type Screen = "home" | GameId;

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {screen === "home" ? (
        <HomeScreen onSelectGame={setScreen} />
      ) : (
        <ChessScreen onBack={() => setScreen("home")} />
      )}
    </SafeAreaProvider>
  );
}
