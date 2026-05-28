import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { ToolCard } from "../../../tools/data";
import GridBoard from "../components/GridBoard";
import RoleBanner from "../components/RoleBanner";
import type { NightSubStep, Player } from "../types";
import { styles } from "../styles";
import GenericAction from "./GenericAction";
import PhuThuyAction from "./PhuThuyAction";

type Props = {
  nightStep: number;
  nightTurns: ToolCard[];
  currentRole: ToolCard | undefined;
  composition: Record<string, number>;
  players: Player[];
  roles: ToolCard[];
  substep: NightSubStep;
  selectedTargets: string[];
  witchHealUsed: boolean;
  witchPoisonUsed: boolean;
  witchBittenPlayers: Player[];
  onToggleIdentify: (playerId: string) => void;
  onIdentifyContinue: () => void;
  onSelectTarget: (id: string) => void;
  onAdvance: (action: "act" | "skip") => void;
  onWitchHeal: (id: string) => void;
  onWitchPoison: (id: string) => void;
  onWitchConfirm: () => void;
};

export default function NightView(props: Props) {
  const { nightStep, nightTurns, currentRole, composition, players, substep } =
    props;

  if (!currentRole) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Đêm không có vai nào hành động.</Text>
        <TouchableOpacity
          onPress={() => props.onAdvance("skip")}
          activeOpacity={0.85}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>Sang ngày</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (substep === "identify") {
    const expected = composition[currentRole.id] ?? 0;
    const marked = players.filter((p) => p.roleId === currentRole.id).length;
    const canContinue = marked === expected;

    return (
      <View>
        <RoleBanner
          step={nightStep}
          total={nightTurns.length}
          role={currentRole}
          tag="Xác định danh tính"
        />

        <View style={styles.card}>
          <Text style={styles.scriptLabel}>LỜI DẪN</Text>
          <Text style={styles.scriptText}>
            Mời {currentRole.name} thức dậy. Đánh dấu {expected} người chơi vai
            này, sau đó nhắm mắt lại.
          </Text>
          <Text style={styles.identifyCounter}>
            Đã đánh dấu: {marked} / {expected}
          </Text>
        </View>

        <Text style={styles.gridHint}>
          Chạm 1 người để gắn vai · chạm lại để bỏ. Người đã có vai khác bị khóa.
        </Text>
        <GridBoard
          players={players}
          roles={props.roles}
          markedRoleId={currentRole.id}
          lockOthers={true}
          showRoles={true}
          onTap={props.onToggleIdentify}
        />

        <TouchableOpacity
          onPress={props.onIdentifyContinue}
          disabled={!canContinue}
          activeOpacity={0.85}
          style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
        >
          <Text style={styles.primaryBtnText}>
            {canContinue
              ? "Tiếp tục ▸"
              : `Cần đánh dấu thêm ${expected - marked} người`}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (currentRole.id === "phu-thuy") {
    return (
      <PhuThuyAction
        nightStep={nightStep}
        nightTurns={nightTurns}
        currentRole={currentRole}
        players={players}
        roles={props.roles}
        selectedTargets={props.selectedTargets}
        witchHealUsed={props.witchHealUsed}
        witchPoisonUsed={props.witchPoisonUsed}
        witchBittenPlayers={props.witchBittenPlayers}
        onSelectTarget={props.onSelectTarget}
        onWitchHeal={props.onWitchHeal}
        onWitchPoison={props.onWitchPoison}
        onWitchConfirm={props.onWitchConfirm}
      />
    );
  }

  return (
    <GenericAction
      nightStep={nightStep}
      nightTurns={nightTurns}
      currentRole={currentRole}
      players={players}
      roles={props.roles}
      selectedTargets={props.selectedTargets}
      onSelectTarget={props.onSelectTarget}
      onAdvance={props.onAdvance}
    />
  );
}
