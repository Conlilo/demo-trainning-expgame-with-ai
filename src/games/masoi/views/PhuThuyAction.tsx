import React, { useState } from "react";
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
  witchHealUsed: boolean;
  witchPoisonUsed: boolean;
  witchBittenPlayers: Player[];
  onSelectTarget: (id: string) => void;
  onWitchHeal: (id: string) => void;
  onWitchPoison: (id: string) => void;
  onWitchConfirm: () => void;
};

export default function PhuThuyAction({
  nightStep,
  nightTurns,
  currentRole,
  players,
  roles,
  selectedTargets,
  witchHealUsed,
  witchPoisonUsed,
  witchBittenPlayers,
  onSelectTarget,
  onWitchHeal,
  onWitchPoison,
  onWitchConfirm,
}: Props) {
  const [poisonMode, setPoisonMode] = useState(false);

  const noBitten = witchBittenPlayers.length === 0;
  const healDisabled = witchHealUsed || noBitten;

  return (
    <View>
      <RoleBanner
        step={nightStep}
        total={nightTurns.length}
        role={currentRole}
        tag="Hành động"
      />

      <View style={styles.card}>
        <Text style={styles.scriptLabel}>LỜI DẪN</Text>
        <Text style={styles.scriptText}>{currentRole.nightInstruction}</Text>
      </View>

      {/* Heal */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Bình hồi sinh</Text>
          <Text
            style={[
              styles.potionStatus,
              witchHealUsed ? styles.potionStatusUsed : styles.potionStatusActive,
            ]}
          >
            {witchHealUsed ? "đã dùng" : "còn 1 bình"}
          </Text>
        </View>
        <Text style={styles.potionHint}>
          {witchHealUsed
            ? "Đã dùng ở đêm trước — không thể cứu thêm."
            : noBitten
            ? "Đêm nay Sói không cắn ai · không có người cần cứu."
            : witchBittenPlayers.length === 1
            ? `Chạm vào ${witchBittenPlayers[0].name} (viền đỏ) để cứu, hoặc bỏ qua.`
            : `Chạm 1 người bị cắn (viền đỏ) để cứu:`}
        </Text>
        <GridBoard
          players={players}
          roles={roles}
          selectableIds={
            healDisabled ? [] : witchBittenPlayers.map((p) => p.id)
          }
          showRoles={true}
          onTap={onWitchHeal}
        />
      </View>

      {/* Poison */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Bình thuốc độc</Text>
          <Text
            style={[
              styles.potionStatus,
              witchPoisonUsed
                ? styles.potionStatusUsed
                : styles.potionStatusActive,
            ]}
          >
            {witchPoisonUsed ? "đã dùng" : "còn 1 bình"}
          </Text>
        </View>
        {witchPoisonUsed ? (
          <Text style={styles.potionHint}>Đã dùng ở đêm trước.</Text>
        ) : !poisonMode ? (
          <TouchableOpacity
            onPress={() => setPoisonMode(true)}
            activeOpacity={0.85}
            style={[styles.potionBtn, styles.potionBtnPoison]}
          >
            <Text style={styles.potionBtnText}>Dùng bình thuốc độc</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <Text style={styles.potionHint}>Chọn 1 người để đầu độc:</Text>
            <GridBoard
              players={players}
              roles={roles}
              selectedIds={selectedTargets}
              showRoles={true}
              onTap={onSelectTarget}
            />
            <View style={styles.rowGap}>
              <TouchableOpacity
                onPress={() => setPoisonMode(false)}
                activeOpacity={0.8}
                style={[styles.secondaryBtn, { flex: 1 }]}
              >
                <Text style={styles.secondaryBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={selectedTargets.length !== 1}
                onPress={() => {
                  onWitchPoison(selectedTargets[0]);
                  setPoisonMode(false);
                }}
                activeOpacity={0.85}
                style={[
                  styles.primaryBtn,
                  { flex: 1, marginTop: 0 },
                  selectedTargets.length !== 1 && styles.primaryBtnDisabled,
                ]}
              >
                <Text style={styles.primaryBtnText}>Đầu độc</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={onWitchConfirm}
        activeOpacity={0.85}
        style={styles.primaryBtn}
      >
        <Text style={styles.primaryBtnText}>Xong · sang ngày ▸</Text>
      </TouchableOpacity>
    </View>
  );
}
