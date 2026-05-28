import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type Folder = "boardgame" | "tool" | "logic";

type Props = {
  onSelectFolder: (folder: Folder) => void;
};

export default function HomeScreen({ onSelectFolder }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <Text style={styles.brand}>AI Board Suite</Text>
        <Text style={styles.tagline}>Chọn mục</Text>

        <FolderCard
          icon="♟"
          iconBg="#7FA650"
          title="Boardgame"
          subtitle="Chơi cờ vua, cờ tướng và game bàn cờ khác"
          onPress={() => onSelectFolder("boardgame")}
        />
        <FolderCard
          icon="工"
          iconBg="#5B7DB1"
          title="Tool"
          subtitle="Công cụ hỗ trợ chơi boardgame ngoài đời"
          onPress={() => onSelectFolder("tool")}
        />
        <FolderCard
          icon="9"
          iconBg="#D4954A"
          title="Logic Game"
          subtitle="Sudoku và các game suy luận"
          onPress={() => onSelectFolder("logic")}
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

function FolderCard({ icon, iconBg, title, subtitle, onPress }: CardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.card}
    >
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
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: {
    fontSize: 30,
    color: "#FFFFFF",
    fontWeight: "900",
  },
  cardBody: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitle: {
    fontSize: 20,
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
