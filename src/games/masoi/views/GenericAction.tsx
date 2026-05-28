import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { ToolCard } from "../../../tools/data";
import GridBoard from "../components/GridBoard";
import RoleBanner from "../components/RoleBanner";
import type { Player } from "../types";
import { styles } from "../styles";

type Props = {
  nightStep: number;
  nightTurns: ToolCard[];
  currentRole: ToolCard;
  players: Player[];
  roles: ToolCard[];
  selectedTargets: string[];
  onSelectTarget: (id: string) => void;
  onAdvance: (action: "act" | "skip") => void;
};

export default function GenericAction({
  nightStep,
  nightTurns,
  currentRole,
  players,
  roles,
  selectedTargets,
  onSelectTarget,
  onAdvance,
}: Props) {
  const targets = currentRole.actionTargets ?? 1;
  const mandatory = currentRole.mandatory === true;
  const remaining = targets - selectedTargets.length;
  const confirmDisabled = mandatory
    ? selectedTargets.length !== targets
    : targets > 1 && remaining > 0;

  return (
    <View>
      <RoleBanner
        step={nightStep}
        total={nightTurns.length}
        role={currentRole}
        tag={targets === 2 ? "Chọn 2 mục tiêu" : "Hành động"}
      />

      <View style={styles.card}>
        <Text style={styles.scriptLabel}>LỜI DẪN</Text>
        <Text style={styles.scriptText}>{currentRole.nightInstruction}</Text>
        {targets > 1 && (
          <Text style={styles.identifyCounter}>
            Đã chọn: {selectedTargets.length} / {targets}
          </Text>
        )}
      </View>

      <Text style={styles.gridHint}>
        {targets > 1
          ? `Chọn ${targets} người · chạm lại để bỏ.`
          : mandatory
          ? "Bắt buộc chọn 1 người chơi còn sống."
          : "Chọn mục tiêu (tùy chọn) — chạm 1 người chơi còn sống."}
      </Text>
      <GridBoard
        players={players}
        roles={roles}
        selectedIds={selectedTargets}
        showRoles={true}
        onTap={onSelectTarget}
      />

      <View style={styles.rowGap}>
        {!mandatory && (
          <TouchableOpacity
            onPress={() => onAdvance("skip")}
            activeOpacity={0.8}
            style={[styles.secondaryBtn, { flex: 1 }]}
          >
            <Text style={styles.secondaryBtnText}>Bỏ qua</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onAdvance("act")}
          disabled={confirmDisabled}
          activeOpacity={0.85}
          style={[
            styles.primaryBtn,
            { flex: 1, marginTop: 0 },
            confirmDisabled && styles.primaryBtnDisabled,
          ]}
        >
          <Text style={styles.primaryBtnText}>
            {confirmDisabled
              ? targets > 1
                ? `Chọn thêm ${remaining}`
                : "Chọn 1 người"
              : "Xác nhận ▸"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
