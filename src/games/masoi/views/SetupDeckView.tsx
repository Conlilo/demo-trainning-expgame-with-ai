import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { ToolCard } from "../../../tools/data";
import Stepper from "../components/Stepper";
import type { Player } from "../types";
import { styles } from "../styles";

type Props = {
  players: Player[];
  roles: ToolCard[];
  composition: Record<string, number>;
  totalDeck: number;
  matches: boolean;
  hasSoi: boolean;
  onAdjustRole: (roleId: string, delta: number) => void;
  onReset: () => void;
  onBack: () => void;
  onStart: () => void;
};

export default function SetupDeckView({
  players,
  roles,
  composition,
  totalDeck,
  matches,
  hasSoi,
  onAdjustRole,
  onReset,
  onBack,
  onStart,
}: Props) {
  const canStart = matches && hasSoi;

  return (
    <View>
      <TouchableOpacity onPress={onBack} style={styles.subBackBtn} activeOpacity={0.7}>
        <Text style={styles.subBackText}>‹ Đổi tên người chơi</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Lá bài trong ván</Text>
          <Text
            style={[
              styles.compTotal,
              matches ? styles.compTotalOk : styles.compTotalBad,
            ]}
          >
            {totalDeck} / {players.length}
          </Text>
        </View>
        <Text style={styles.gridHint}>
          Chọn bao nhiêu lá cho mỗi vai. Tổng phải khớp số người chơi.
        </Text>

        {roles.map((r) => (
          <View key={r.id} style={styles.roleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.roleName}>{r.name}</Text>
              <Text
                style={[
                  styles.roleFaction,
                  r.faction === "Sói" ? styles.factionWolf : styles.factionVillager,
                ]}
              >
                {r.group}
              </Text>
            </View>
            <Stepper
              value={composition[r.id] ?? 0}
              onDelta={(d) => onAdjustRole(r.id, d)}
            />
          </View>
        ))}

        <TouchableOpacity onPress={onReset} activeOpacity={0.8} style={styles.linkBtn}>
          <Text style={styles.linkBtnText}>↺ Đặt lại theo gợi ý</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onStart}
        disabled={!canStart}
        activeOpacity={0.85}
        style={[styles.primaryBtn, !canStart && styles.primaryBtnDisabled]}
      >
        <Text style={styles.primaryBtnText}>
          {!hasSoi
            ? "Cần ít nhất 1 Sói"
            : !matches
            ? "Tổng lá chưa khớp số người chơi"
            : "Bắt đầu ván"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
