import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type LogicGameId = "sudoku" | "queens";

type Props = {
  onBack: () => void;
  onSelectGame: (id: LogicGameId) => void;
};

export default function LogicGameListScreen({ onBack, onSelectGame }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onBack}
            style={styles.side}
          >
            <Text style={styles.backText}>‹ Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Logic Game</Text>
          <View style={styles.side} />
        </View>

        <GameCard
          icon="9"
          iconBg="#D4954A"
          title="Sudoku"
          subtitle="Điền số 1–9 sao cho không trùng hàng, cột, ô 3×3"
          onPress={() => onSelectGame("sudoku")}
        />
        <GameCard
          icon="♛"
          iconBg="#7E57C2"
          title="Queens"
          subtitle="Đặt hậu: mỗi hàng, cột, vùng màu 1 quân; không chạm nhau"
          onPress={() => onSelectGame("queens")}
        />
      </View>
    </SafeAreaView>
  );
}

type CardProps = {
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function GameCard({ icon, iconBg, title, subtitle, onPress }: CardProps) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.card}>
      <View style={[styles.cardIcon, { backgroundColor: iconBg }]}>
        <Text style={styles.cardIconText}>{icon}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.cardChevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#262421" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  side: { width: 96, paddingVertical: 4 },
  backText: { fontSize: 15, fontWeight: "700", color: "#7FA650" },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    color: "#F2F2F2",
    textAlign: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3A3733",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: {
    fontSize: 32,
    color: "#FFFFFF",
    fontWeight: "900",
  },
  cardBody: { flex: 1, marginLeft: 14 },
  cardTitle: { fontSize: 19, fontWeight: "700", color: "#FFFFFF" },
  cardSubtitle: { fontSize: 13, color: "#A8A39B", marginTop: 2 },
  cardChevron: { fontSize: 28, color: "#A8A39B", marginLeft: 8 },
});
