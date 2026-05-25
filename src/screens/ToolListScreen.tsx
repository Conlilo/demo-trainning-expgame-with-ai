import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TOOL_GAMES } from "../tools/data";

type Props = {
  onBack: () => void;
  onSelectGame: (id: string) => void;
};

export default function ToolListScreen({ onBack, onSelectGame }: Props) {
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
          <Text style={styles.title}>Tool</Text>
          <View style={styles.side} />
        </View>

        <Text style={styles.intro}>
          Tra cứu luật và bộ bài khi bạn chơi boardgame ngoài đời, hoặc dùng AI làm GM khi chỉ chơi một mình.
        </Text>

        <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
          {TOOL_GAMES.map((g) => (
            <TouchableOpacity
              key={g.id}
              activeOpacity={0.85}
              onPress={() => onSelectGame(g.id)}
              style={styles.card}
            >
              <View style={[styles.cardIcon, { backgroundColor: g.iconBg }]}>
                <Text style={styles.cardIconText}>{g.icon}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{g.name}</Text>
                <Text style={styles.cardSubtitle}>{g.shortDesc}</Text>
                <Text style={styles.cardMeta}>{g.players} · {g.duration}</Text>
              </View>
              <Text style={styles.cardChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#262421" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
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
  intro: {
    color: "#A8A39B",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3A3733",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "900",
  },
  cardBody: { flex: 1, marginLeft: 14 },
  cardTitle: { fontSize: 19, fontWeight: "700", color: "#FFFFFF" },
  cardSubtitle: { fontSize: 13, color: "#C7C2BA", marginTop: 2 },
  cardMeta: { fontSize: 12, color: "#8C877F", marginTop: 4 },
  cardChevron: { fontSize: 28, color: "#A8A39B", marginLeft: 8 },
});
