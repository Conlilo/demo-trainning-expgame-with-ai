import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type GameId = "chess";

type Props = {
  onSelectGame: (game: GameId) => void;
};

export default function HomeScreen({ onSelectGame }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <Text style={styles.brand}>AI Board Suite</Text>
        <Text style={styles.tagline}>Chọn trò chơi</Text>

        <GameCard
          icon="♟"
          title="Cờ Vua"
          subtitle="Đấu với máy hoặc 2 người"
          onPress={() => onSelectGame("chess")}
        />
        <GameCard
          icon="将"
          title="Cờ Tướng"
          subtitle="Sắp ra mắt"
          disabled
        />
      </View>
    </SafeAreaView>
  );
}

type GameCardProps = {
  icon: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  disabled?: boolean;
};

function GameCard({ icon, title, subtitle, onPress, disabled }: GameCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      onPress={onPress}
      style={[styles.card, disabled && styles.cardDisabled]}
    >
      <View style={styles.cardIcon}>
        <Text style={styles.cardIconText}>{icon}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      {!disabled && <Text style={styles.cardChevron}>›</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#262421",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  brand: {
    fontSize: 32,
    fontWeight: "800",
    color: "#F2F2F2",
  },
  tagline: {
    fontSize: 15,
    color: "#A8A39B",
    marginTop: 4,
    marginBottom: 32,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#3A3733",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  cardDisabled: {
    opacity: 0.45,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#7FA650",
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: {
    fontSize: 32,
    color: "#FFFFFF",
    fontWeight: "900",
  },
  cardBody: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#A8A39B",
    marginTop: 2,
  },
  cardChevron: {
    fontSize: 28,
    color: "#A8A39B",
    marginLeft: 8,
  },
});
