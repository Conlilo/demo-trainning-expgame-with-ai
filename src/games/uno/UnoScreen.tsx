import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  findToolGame,
  SessionCounter,
  ToolCard,
  ToolGame,
} from "../../tools/data";

type Props = {
  gameId: string;
  onBack: () => void;
  aiMode: boolean;
  onAiModeChange: (value: boolean) => void;
};

export default function UnoScreen(props: Props) {
  const game = findToolGame(props.gameId);
  if (!game) return <NotFound onBack={props.onBack} />;
  return <SessionView {...props} game={game} />;
}

function SessionView({
  game,
  onBack,
  aiMode,
  onAiModeChange,
}: Props & { game: ToolGame }) {
  const [playerCount, setPlayerCount] = useState(game.defaultPlayers);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [forward, setForward] = useState(true);

  const initialCounters = useMemo<Record<string, number>>(
    () =>
      Object.fromEntries(
        (game.sessionCounters ?? []).map((c) => [c.id, c.initial])
      ),
    [game.id]
  );
  const [counters, setCounters] = useState(initialCounters);

  const [notes, setNotes] = useState("");
  const [showCards, setShowCards] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const nextTurn = (): void => {
    setCurrentPlayer((p) => {
      const step = forward ? 1 : -1;
      return ((p - 1 + step + playerCount) % playerCount) + 1;
    });
  };

  const flipDirection = (): void => setForward((v) => !v);

  const adjustPlayers = (delta: number): void => {
    setPlayerCount((p) => {
      const next = Math.max(2, Math.min(20, p + delta));
      if (currentPlayer > next) setCurrentPlayer(next);
      return next;
    });
  };

  const adjustCounter = (c: SessionCounter, delta: number): void => {
    setCounters((prev) => {
      const cur = prev[c.id] ?? c.initial;
      const step = c.step ?? 1;
      const min = c.min ?? 0;
      return { ...prev, [c.id]: Math.max(min, cur + delta * step) };
    });
  };

  const newRound = (): void => {
    setCurrentPlayer(1);
    setForward(true);
    setCounters(initialCounters);
    setNotes("");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.side}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>‹ Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {game.name} · Ván chơi
          </Text>
          <View style={styles.modeBox}>
            <Switch
              value={aiMode}
              onValueChange={onAiModeChange}
              trackColor={{ false: "#555", true: "#7FA650" }}
              thumbColor="#fff"
            />
            <Text style={styles.modeBoxLabel}>{aiMode ? "AI" : "Tay"}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {aiMode && (
            <View style={styles.aiPanel}>
              <Text style={styles.aiTitle}>AI thực thi · đang phát triển</Text>
              <Text style={styles.aiBody}>
                Sắp tới: bạn mô tả tình huống, AI sẽ áp luật, gợi ý nước đi, và
                điều phối từng lượt giùm bạn.
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.colLabel}>Số người chơi</Text>
                <Stepper value={playerCount} onDelta={adjustPlayers} />
              </View>
              <View style={styles.col}>
                <Text style={styles.colLabel}>Hướng đi</Text>
                <TouchableOpacity
                  onPress={flipDirection}
                  activeOpacity={0.8}
                  style={styles.dirBtn}
                >
                  <Text style={styles.dirText}>
                    {forward ? "Thuận  →" : "←  Nghịch"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.turnBox}>
              <Text style={styles.turnLabel}>LƯỢT HIỆN TẠI</Text>
              <Text style={styles.turnValue}>
                Người {currentPlayer} / {playerCount}
              </Text>
              <TouchableOpacity
                onPress={nextTurn}
                activeOpacity={0.85}
                style={styles.nextBtn}
              >
                <Text style={styles.nextBtnText}>Lượt kế tiếp ▸</Text>
              </TouchableOpacity>
            </View>
          </View>

          {(game.sessionCounters ?? []).length > 0 && (
            <View style={styles.card}>
              {game.sessionCounters!.map((c) => (
                <View key={c.id} style={styles.counterRow}>
                  <Text style={styles.counterLabel}>{c.label}</Text>
                  <Stepper
                    value={counters[c.id] ?? c.initial}
                    onDelta={(d) => adjustCounter(c, d)}
                  />
                </View>
              ))}
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.notesLabel}>Ghi chú</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Ghi nhanh điều gì đó..."
              placeholderTextColor="#666"
              multiline
            />
          </View>

          <Expandable
            label={`Tra cứu thẻ bài (${game.cards.length})`}
            expanded={showCards}
            onToggle={() => setShowCards((v) => !v)}
          >
            {game.cards.map((c) => (
              <MiniCard key={c.id} card={c} />
            ))}
          </Expandable>

          <Expandable
            label="Tra cứu luật"
            expanded={showRules}
            onToggle={() => setShowRules((v) => !v)}
          >
            <Text style={styles.rulesText}>{game.rules}</Text>
          </Expandable>

          <TouchableOpacity
            onPress={newRound}
            activeOpacity={0.85}
            style={styles.resetBtn}
          >
            <Text style={styles.resetText}>↺  Ván mới</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ---- subcomponents ---------------------------------------------------------

function Stepper({
  value,
  onDelta,
}: {
  value: number;
  onDelta: (delta: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        onPress={() => onDelta(-1)}
        activeOpacity={0.7}
        style={styles.stepBtn}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}</Text>
      <TouchableOpacity
        onPress={() => onDelta(1)}
        activeOpacity={0.7}
        style={styles.stepBtn}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function Expandable({
  label,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.expand}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.8}
        style={styles.expandHeader}
      >
        <Text style={styles.expandLabel}>{label}</Text>
        <Text style={styles.expandChevron}>{expanded ? "▾" : "▸"}</Text>
      </TouchableOpacity>
      {expanded && <View style={styles.expandBody}>{children}</View>}
    </View>
  );
}

function MiniCard({ card }: { card: ToolCard }) {
  return (
    <View style={styles.miniCard}>
      <View style={styles.miniHeader}>
        <Text style={styles.miniName}>{card.name}</Text>
        {card.group && <Text style={styles.miniGroup}>{card.group}</Text>}
      </View>
      <Text style={styles.miniDesc}>{card.description}</Text>
    </View>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View
        style={[
          styles.container,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Text style={styles.title}>Không tìm thấy game</Text>
        <TouchableOpacity onPress={onBack} style={{ marginTop: 16 }}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---- styles ----------------------------------------------------------------

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
    fontSize: 18,
    fontWeight: "800",
    color: "#F2F2F2",
    textAlign: "center",
  },
  modeBox: {
    width: 96,
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modeBoxLabel: {
    color: "#A8A39B",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },

  aiPanel: {
    backgroundColor: "#37412B",
    borderLeftWidth: 3,
    borderLeftColor: "#7FA650",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  aiTitle: {
    color: "#C5DC9E",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  aiBody: { color: "#D8D2C8", fontSize: 13, lineHeight: 18 },

  card: {
    backgroundColor: "#3A3733",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },

  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  colLabel: { color: "#A8A39B", fontSize: 12, marginBottom: 6 },

  dirBtn: {
    backgroundColor: "#4A4641",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  dirText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  turnBox: {
    marginTop: 12,
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#4A4641",
  },
  turnLabel: { color: "#A8A39B", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  turnValue: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 12,
  },
  nextBtn: {
    backgroundColor: "#7FA650",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
  },
  nextBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },

  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  counterLabel: { color: "#E8E4DE", fontSize: 15, fontWeight: "600", flex: 1 },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2724",
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  stepBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  stepValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    minWidth: 40,
    textAlign: "center",
  },

  notesLabel: { color: "#A8A39B", fontSize: 12, marginBottom: 6 },
  notesInput: {
    minHeight: 70,
    color: "#FFFFFF",
    fontSize: 14,
    backgroundColor: "#2A2724",
    borderRadius: 8,
    padding: 10,
    textAlignVertical: "top",
  },

  expand: {
    backgroundColor: "#3A3733",
    borderRadius: 10,
    marginBottom: 10,
    overflow: "hidden",
  },
  expandHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  expandLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  expandChevron: { color: "#A8A39B", fontSize: 16, fontWeight: "700" },
  expandBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#4A4641",
    paddingTop: 12,
  },

  miniCard: {
    backgroundColor: "#2F2C29",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  miniHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  miniName: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", flex: 1 },
  miniGroup: {
    color: "#7FA650",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    marginLeft: 6,
  },
  miniDesc: { color: "#C7C2BA", fontSize: 13, lineHeight: 18 },

  rulesText: { color: "#E8E4DE", fontSize: 14, lineHeight: 22 },

  resetBtn: {
    backgroundColor: "#4A4641",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  resetText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
