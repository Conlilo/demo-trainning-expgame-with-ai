import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import type { LoverReveal, Player } from "../types";
import { styles } from "../styles";

type Props = {
  loverReveal: LoverReveal;
  players: Player[];
  onClose: () => void;
};

export default function LoverRevealModal({
  loverReveal,
  players,
  onClose,
}: Props) {
  if (!loverReveal) return null;
  const a = players.find((p) => p.id === loverReveal[0]);
  const b = players.find((p) => p.id === loverReveal[1]);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.revealCard, { backgroundColor: "#9C2762" }]}>
          <Text style={styles.revealLabel}>CUPID KẾT ĐÔI</Text>
          <Text style={styles.loverScript}>
            Mời cặp đôi tỉnh dậy và nhìn nhau — họ sẽ yêu nhau và cùng sống chết
            từ đây.
          </Text>
          <View style={styles.loverPair}>
            <Text style={styles.loverName}>{a?.name ?? "?"}</Text>
            <Text style={styles.loverHeart}>♥</Text>
            <Text style={styles.loverName}>{b?.name ?? "?"}</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={styles.revealBtn}
          >
            <Text style={styles.revealBtnText}>Cặp đôi nhắm mắt ▸</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
