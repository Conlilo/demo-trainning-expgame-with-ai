import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import GridBoard from "../components/GridBoard";
import Stepper from "../components/Stepper";
import type { Player } from "../types";
import { styles } from "../styles";

type Props = {
  players: Player[];
  onAdjustPlayers: (delta: number) => void;
  onContinue: () => void;
};

export default function SetupCountView({
  players,
  onAdjustPlayers,
  onContinue,
}: Props) {
  return (
    <View>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Số người chơi</Text>
          <Stepper value={players.length} onDelta={onAdjustPlayers} />
        </View>
        <Text style={styles.gridHint}>
          Mỗi ô là 1 ghế ngồi. Bước tiếp theo bạn sẽ đặt tên cho từng người.
        </Text>
        <GridBoard players={players} showRoles={false} />
      </View>

      <TouchableOpacity
        onPress={onContinue}
        activeOpacity={0.85}
        style={styles.primaryBtn}
      >
        <Text style={styles.primaryBtnText}>Tiếp tục · đặt tên ▸</Text>
      </TouchableOpacity>
    </View>
  );
}
