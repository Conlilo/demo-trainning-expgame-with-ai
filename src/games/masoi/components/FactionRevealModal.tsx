import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import type { Player, Reveal } from "../types";
import { styles } from "../styles";

type Props = {
  reveal: Reveal;
  players: Player[];
  onClose: () => void;
};

export default function FactionRevealModal({ reveal, players, onClose }: Props) {
  if (!reveal) return null;
  const player = players.find((p) => p.id === reveal.playerId);
  const isWolf = reveal.faction === "Sói";
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.revealCard,
            { backgroundColor: isWolf ? "#7C2929" : "#37412B" },
          ]}
        >
          <Text style={styles.revealLabel}>TIÊN TRI SOI</Text>
          <Text style={styles.revealName}>{player?.name ?? "?"}</Text>
          <Text style={styles.revealFaction}>
            thuộc phe {isWolf ? "SÓI" : "DÂN"}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={styles.revealBtn}
          >
            <Text style={styles.revealBtnText}>Đóng & tiếp ▸</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
