import React from "react";
import { View, Text, TouchableOpacity, Switch } from "react-native";
import type { ToolCard } from "../../../tools/data";
import GridBoard from "../components/GridBoard";
import type { Player } from "../types";
import { styles } from "../styles";

type Props = {
  dayNum: number;
  players: Player[];
  roles: ToolCard[];
  revealRoles: boolean;
  onToggleReveal: (v: boolean) => void;
  onToggleAlive: (id: string) => void;
  log: string[];
  onGoToNight: () => void;
  onNewRound: () => void;
};

export default function DayView({
  players,
  roles,
  revealRoles,
  onToggleReveal,
  onToggleAlive,
  log,
  onGoToNight,
  onNewRound,
}: Props) {
  return (
    <View>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Lộ vai (GM)</Text>
          <Switch
            value={revealRoles}
            onValueChange={onToggleReveal}
            trackColor={{ false: "#555", true: "#7FA650" }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.gridHint}>
          Chạm vào người chơi để chuyển sống ↔ chết.
        </Text>
        <GridBoard
          players={players}
          roles={roles}
          showRoles={revealRoles}
          onTap={onToggleAlive}
        />
      </View>

      {log.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nhật ký gần đây</Text>
          {log
            .slice(-8)
            .reverse()
            .map((entry, i) => (
              <Text key={i} style={styles.logEntry}>
                · {entry}
              </Text>
            ))}
        </View>
      )}

      <TouchableOpacity
        onPress={onGoToNight}
        activeOpacity={0.85}
        style={styles.primaryBtn}
      >
        <Text style={styles.primaryBtnText}>Sang đêm tiếp theo ▸</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onNewRound}
        activeOpacity={0.85}
        style={styles.secondaryBtn}
      >
        <Text style={styles.secondaryBtnText}>↺ Ván mới</Text>
      </TouchableOpacity>
    </View>
  );
}
