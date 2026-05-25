import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { findToolGame, ToolCard } from "../tools/data";

type Props = {
  gameId: string;
  onBack: () => void;
  aiMode: boolean;
  onAiModeChange: (value: boolean) => void;
  onStartSession: () => void;
};

type Tab = "rules" | "cards";

export default function ToolGameScreen({
  gameId,
  onBack,
  aiMode,
  onAiModeChange,
  onStartSession,
}: Props) {
  const game = findToolGame(gameId);
  const [tab, setTab] = useState<Tab>("rules");

  if (!game) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={[styles.container, styles.center]}>
          <Text style={styles.title}>Không tìm thấy game</Text>
          <TouchableOpacity onPress={onBack} style={styles.linkBtn}>
            <Text style={styles.backText}>‹ Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title} numberOfLines={1}>
            {game.name}
          </Text>
          <View style={styles.side} />
        </View>

        <Text style={styles.meta}>{game.players} · {game.duration}</Text>

        {game.supportsAi !== false && (
          <View style={styles.modeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeLabel}>Chế độ</Text>
              <Text style={styles.modeValue}>
                {aiMode ? "AI thực thi" : "Thủ công"}
              </Text>
            </View>
            <Switch
              value={aiMode}
              onValueChange={onAiModeChange}
              trackColor={{ false: "#555", true: "#7FA650" }}
              thumbColor="#fff"
            />
          </View>
        )}

        {game.supportsAi !== false && aiMode && <AiPanel />}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onStartSession}
          style={styles.startBtn}
        >
          <Text style={styles.startBtnText}>▶  Bắt đầu ván</Text>
        </TouchableOpacity>

        <View style={styles.tabs}>
          <TabButton
            label="Luật"
            active={tab === "rules"}
            onPress={() => setTab("rules")}
          />
          <TabButton
            label={`Thẻ bài (${game.cards.length})`}
            active={tab === "cards"}
            onPress={() => setTab("cards")}
          />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {tab === "rules" ? (
            <View style={styles.rulesBox}>
              <Text style={styles.rulesText}>{game.rules}</Text>
            </View>
          ) : (
            game.cards.map((c) => <CardItem key={c.id} card={c} />)
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function AiPanel() {
  return (
    <View style={styles.aiPanel}>
      <Text style={styles.aiTitle}>AI thực thi · đang phát triển</Text>
      <Text style={styles.aiBody}>
        Khi hoàn thiện, bạn có thể hỏi AI về luật, nhờ AI giải nghĩa từng nước
        đi, hoặc để AI làm GM khi không đủ người chơi.
      </Text>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.tabBtn, active && styles.tabBtnActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CardItem({ card }: { card: ToolCard }) {
  return (
    <View style={styles.cardItem}>
      <View style={styles.cardItemHeader}>
        <Text style={styles.cardItemName}>{card.name}</Text>
        {card.group && (
          <Text style={styles.cardItemGroup}>{card.group}</Text>
        )}
      </View>
      <View style={styles.cardItemImage}>
        <Text style={styles.cardItemImageLabel}>Ảnh sẽ cập nhật</Text>
      </View>
      <Text style={styles.cardItemDesc}>{card.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#262421" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  center: { alignItems: "center", justifyContent: "center" },
  linkBtn: { marginTop: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  side: { width: 96, paddingVertical: 4 },
  backText: { fontSize: 15, fontWeight: "700", color: "#7FA650" },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#F2F2F2",
    textAlign: "center",
  },
  meta: {
    fontSize: 13,
    color: "#A8A39B",
    textAlign: "center",
    marginBottom: 12,
  },

  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3A3733",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  modeLabel: { color: "#A8A39B", fontSize: 12 },
  modeValue: { color: "#FFF", fontSize: 16, fontWeight: "700", marginTop: 2 },

  startBtn: {
    backgroundColor: "#D0021B",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  startBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  aiPanel: {
    backgroundColor: "#37412B",
    borderLeftWidth: 3,
    borderLeftColor: "#7FA650",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  aiTitle: { color: "#C5DC9E", fontSize: 13, fontWeight: "800", marginBottom: 4 },
  aiBody: { color: "#D8D2C8", fontSize: 13, lineHeight: 18 },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#2F2C29",
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: "#4A4641" },
  tabText: { color: "#A8A39B", fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: "#FFFFFF" },

  rulesBox: {
    backgroundColor: "#3A3733",
    borderRadius: 10,
    padding: 14,
  },
  rulesText: {
    color: "#E8E4DE",
    fontSize: 14,
    lineHeight: 22,
  },

  cardItem: {
    backgroundColor: "#3A3733",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardItemName: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", flex: 1 },
  cardItemGroup: {
    color: "#7FA650",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    backgroundColor: "rgba(127,166,80,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  cardItemImage: {
    height: 96,
    borderRadius: 8,
    backgroundColor: "#2A2724",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#4A4641",
    borderStyle: "dashed",
  },
  cardItemImageLabel: { color: "#666", fontSize: 12, fontStyle: "italic" },
  cardItemDesc: { color: "#D8D2C8", fontSize: 14, lineHeight: 20 },
});
