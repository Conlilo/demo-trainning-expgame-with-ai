import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { findToolGame } from "../../tools/data";
import Session from "./Session";
import { styles } from "./styles";

type Props = {
  gameId: string;
  onBack: () => void;
};

export default function MaSoiScreen({ gameId, onBack }: Props) {
  const game = findToolGame(gameId);
  if (!game) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View
          style={[
            styles.container,
            { alignItems: "center", justifyContent: "center" },
          ]}
        >
          <Text style={styles.title}>Không tìm thấy game</Text>
          <TouchableOpacity onPress={onBack} style={{ marginTop: 16 }}>
            <Text style={styles.backText}>‹ Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  return <Session game={game} onBack={onBack} />;
}
