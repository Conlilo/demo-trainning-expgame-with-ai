import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { ToolCard } from "../../../tools/data";
import GridBoard from "../components/GridBoard";
import type { Player } from "../types";
import { styles } from "../styles";

type Props = {
  winner: "Sói" | "Dân";
  players: Player[];
  roles: ToolCard[];
  onNewRound: () => void;
};

export default function EndgameView({ winner, players, roles, onNewRound }: Props) {
  return (
    <View>
      <View
        style={[
          styles.winBanner,
          { backgroundColor: winner === "Sói" ? "#7C2929" : "#37412B" },
        ]}
      >
        <Text style={styles.winLabel}>KẾT THÚC</Text>
        <Text style={styles.winText}>Phe {winner} thắng!</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lộ tất cả vai trò</Text>
        <GridBoard players={players} roles={roles} showRoles={true} />
      </View>

      <TouchableOpacity
        onPress={onNewRound}
        activeOpacity={0.85}
        style={styles.primaryBtn}
      >
        <Text style={styles.primaryBtnText}>↺ Ván mới</Text>
      </TouchableOpacity>
    </View>
  );
}
