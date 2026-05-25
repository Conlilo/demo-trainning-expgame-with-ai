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
import { findToolGame, ToolCard, ToolGame } from "../tools/data";

type Props = {
  gameId: string;
  onBack: () => void;
};

type Phase = "setup" | "night" | "day";

type Player = {
  id: string;
  name: string;
  roleId: string | null;
  alive: boolean;
};

export default function MaSoiSessionScreen(props: Props) {
  const game = findToolGame(props.gameId);
  if (!game) return <NotFound onBack={props.onBack} />;
  return <Session game={game} {...props} />;
}

function Session({
  game,
  onBack,
}: Props & { game: ToolGame }) {
  const roles = game.cards;
  const nightRoles = useMemo(
    () =>
      roles
        .filter((r) => r.nightOrder != null)
        .sort((a, b) => (a.nightOrder ?? 0) - (b.nightOrder ?? 0)),
    [game.id]
  );

  const [phase, setPhase] = useState<Phase>("setup");
  const [dayNum, setDayNum] = useState(1);
  const [players, setPlayers] = useState<Player[]>(() =>
    makePlayers(game.defaultPlayers)
  );
  const [composition, setComposition] = useState<Record<string, number>>(() =>
    defaultComposition(game.defaultPlayers)
  );
  const [nightStep, setNightStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [revealRoles, setRevealRoles] = useState(true);

  // Only roles still represented by an alive player turn up at night.
  const nightTurns = useMemo(() => {
    const firstNight = dayNum === 1;
    return nightRoles.filter((r) => {
      if (r.onlyFirstNight && !firstNight) return false;
      return players.some((p) => p.alive && p.roleId === r.id);
    });
  }, [nightRoles, players, dayNum]);

  const currentNightRole = nightTurns[nightStep];
  const winner = useMemo(() => checkWinner(players, roles), [players, roles]);
  const totalComposition = sum(Object.values(composition));
  const compositionMatches = totalComposition === players.length;

  // ---- Setup actions ------------------------------------------------------

  const adjustPlayerCount = (delta: number): void => {
    setPlayers((prev) => {
      const next = Math.max(4, Math.min(20, prev.length + delta));
      if (next === prev.length) return prev;
      if (next > prev.length) {
        const extras = Array.from({ length: next - prev.length }, (_, i) =>
          blankPlayer(prev.length + i + 1)
        );
        return [...prev, ...extras];
      }
      return prev.slice(0, next);
    });
  };

  const renamePlayer = (id: string, name: string): void => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const adjustRoleCount = (roleId: string, delta: number): void => {
    setComposition((prev) => {
      const cur = prev[roleId] ?? 0;
      return { ...prev, [roleId]: Math.max(0, cur + delta) };
    });
  };

  const resetComposition = (): void => {
    setComposition(defaultComposition(players.length));
  };

  const startGame = (): void => {
    setPlayers((prev) => assignRoles(prev, composition));
    setPhase("night");
    setDayNum(1);
    setNightStep(0);
    setSelectedTarget(null);
    setLog([]);
  };

  // ---- Night actions ------------------------------------------------------

  const advanceNight = (action: "act" | "skip"): void => {
    if (!currentNightRole) return;
    if (action === "act" && selectedTarget) {
      const target = players.find((p) => p.id === selectedTarget);
      if (target) {
        setLog((l) => [
          ...l,
          `Đêm ${dayNum} · ${currentNightRole.name} → ${target.name}`,
        ]);
      }
    } else if (action === "skip") {
      setLog((l) => [
        ...l,
        `Đêm ${dayNum} · ${currentNightRole.name} bỏ qua`,
      ]);
    }
    setSelectedTarget(null);
    if (nightStep + 1 >= nightTurns.length) {
      setPhase("day");
    } else {
      setNightStep((s) => s + 1);
    }
  };

  // ---- Day actions --------------------------------------------------------

  const togglePlayerAlive = (id: string): void => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, alive: !p.alive } : p))
    );
  };

  const goToNextNight = (): void => {
    setPhase("night");
    setDayNum((d) => d + 1);
    setNightStep(0);
    setSelectedTarget(null);
  };

  const newRound = (): void => {
    setPhase("setup");
    setDayNum(1);
    setNightStep(0);
    setSelectedTarget(null);
    setLog([]);
    setPlayers((prev) =>
      prev.map((p) => ({ ...p, roleId: null, alive: true }))
    );
  };

  // ---- Render -------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <Header
          title={`${game.name} · ${phaseLabel(phase, dayNum)}`}
          onBack={onBack}
        />

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {winner ? (
            <Endgame
              winner={winner}
              players={players}
              roles={roles}
              onNewRound={newRound}
            />
          ) : phase === "setup" ? (
            <SetupView
              players={players}
              roles={roles}
              composition={composition}
              totalComposition={totalComposition}
              matches={compositionMatches}
              onAdjustPlayers={adjustPlayerCount}
              onRenamePlayer={renamePlayer}
              onAdjustRole={adjustRoleCount}
              onResetComposition={resetComposition}
              onStart={startGame}
            />
          ) : phase === "night" ? (
            <NightView
              dayNum={dayNum}
              nightStep={nightStep}
              nightTurns={nightTurns}
              currentRole={currentNightRole}
              players={players}
              selectedTarget={selectedTarget}
              onSelectTarget={setSelectedTarget}
              onAdvance={advanceNight}
            />
          ) : (
            <DayView
              dayNum={dayNum}
              players={players}
              roles={roles}
              revealRoles={revealRoles}
              onToggleReveal={setRevealRoles}
              onToggleAlive={togglePlayerAlive}
              log={log}
              onGoToNight={goToNextNight}
              onNewRound={newRound}
            />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ---- Header --------------------------------------------------------------

function Header({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.side} activeOpacity={0.7}>
        <Text style={styles.backText}>‹ Quay lại</Text>
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.side} />
    </View>
  );
}

// ---- Setup ---------------------------------------------------------------

function SetupView(props: {
  players: Player[];
  roles: ToolCard[];
  composition: Record<string, number>;
  totalComposition: number;
  matches: boolean;
  onAdjustPlayers: (delta: number) => void;
  onRenamePlayer: (id: string, name: string) => void;
  onAdjustRole: (roleId: string, delta: number) => void;
  onResetComposition: () => void;
  onStart: () => void;
}) {
  const {
    players,
    roles,
    composition,
    totalComposition,
    matches,
    onAdjustPlayers,
    onRenamePlayer,
    onAdjustRole,
    onResetComposition,
    onStart,
  } = props;

  return (
    <View>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Số người chơi</Text>
          <Stepper value={players.length} onDelta={onAdjustPlayers} />
        </View>
        <View style={{ marginTop: 10 }}>
          {players.map((p, idx) => (
            <View key={p.id} style={styles.playerInputRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{idx + 1}</Text>
              </View>
              <TextInput
                style={styles.playerInput}
                value={p.name}
                onChangeText={(t) => onRenamePlayer(p.id, t)}
                placeholder={`Người ${idx + 1}`}
                placeholderTextColor="#666"
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Vai trò</Text>
          <Text
            style={[
              styles.compTotal,
              matches ? styles.compTotalOk : styles.compTotalBad,
            ]}
          >
            {totalComposition} / {players.length}
          </Text>
        </View>
        {roles.map((r) => (
          <View key={r.id} style={styles.roleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.roleName}>{r.name}</Text>
              <Text
                style={[
                  styles.roleFaction,
                  r.faction === "Sói"
                    ? styles.factionWolf
                    : styles.factionVillager,
                ]}
              >
                {r.group}
              </Text>
            </View>
            <Stepper
              value={composition[r.id] ?? 0}
              onDelta={(d) => onAdjustRole(r.id, d)}
            />
          </View>
        ))}

        <TouchableOpacity
          onPress={onResetComposition}
          activeOpacity={0.8}
          style={styles.linkBtn}
        >
          <Text style={styles.linkBtnText}>↺ Đặt lại theo gợi ý</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onStart}
        disabled={!matches}
        activeOpacity={0.85}
        style={[styles.primaryBtn, !matches && styles.primaryBtnDisabled]}
      >
        <Text style={styles.primaryBtnText}>
          {matches ? "Phát bài & bắt đầu" : "Cần đủ số vai khớp người chơi"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ---- Night ---------------------------------------------------------------

function NightView(props: {
  dayNum: number;
  nightStep: number;
  nightTurns: ToolCard[];
  currentRole: ToolCard | undefined;
  players: Player[];
  selectedTarget: string | null;
  onSelectTarget: (id: string) => void;
  onAdvance: (action: "act" | "skip") => void;
}) {
  const { nightStep, nightTurns, currentRole, players, selectedTarget } = props;

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

  return (
    <View>
      <View style={styles.nightHeader}>
        <Text style={styles.nightProgress}>
          Vai {nightStep + 1} / {nightTurns.length}
        </Text>
        <Text style={styles.nightRoleName}>{currentRole.name}</Text>
        <Text
          style={[
            styles.roleFaction,
            currentRole.faction === "Sói"
              ? styles.factionWolf
              : styles.factionVillager,
          ]}
        >
          {currentRole.group}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.scriptLabel}>LỜI DẪN</Text>
        <Text style={styles.scriptText}>{currentRole.nightInstruction}</Text>
      </View>

      <Text style={styles.gridHint}>
        Chọn mục tiêu (tùy chọn) — chạm 1 người chơi còn sống.
      </Text>
      <PlayerGrid
        players={players.filter((p) => p.alive)}
        selected={selectedTarget}
        onTap={props.onSelectTarget}
        showRoles={false}
      />

      <View style={styles.rowGap}>
        <TouchableOpacity
          onPress={() => props.onAdvance("skip")}
          activeOpacity={0.8}
          style={[styles.secondaryBtn, { flex: 1 }]}
        >
          <Text style={styles.secondaryBtnText}>Bỏ qua</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => props.onAdvance("act")}
          activeOpacity={0.85}
          style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
        >
          <Text style={styles.primaryBtnText}>Ghi nhận & tiếp ▸</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---- Day -----------------------------------------------------------------

function DayView(props: {
  dayNum: number;
  players: Player[];
  roles: ToolCard[];
  revealRoles: boolean;
  onToggleReveal: (v: boolean) => void;
  onToggleAlive: (id: string) => void;
  log: string[];
  onGoToNight: () => void;
  onNewRound: () => void;
}) {
  const { players, roles, revealRoles, log } = props;

  return (
    <View>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Lộ vai (GM)</Text>
          <Switch
            value={revealRoles}
            onValueChange={props.onToggleReveal}
            trackColor={{ false: "#555", true: "#7FA650" }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.gridHint}>
          Chạm vào người chơi để chuyển sống ↔ chết.
        </Text>
        <PlayerGrid
          players={players}
          selected={null}
          onTap={props.onToggleAlive}
          showRoles={revealRoles}
          roles={roles}
        />
      </View>

      {log.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nhật ký gần đây</Text>
          {log.slice(-8).reverse().map((entry, i) => (
            <Text key={i} style={styles.logEntry}>
              · {entry}
            </Text>
          ))}
        </View>
      )}

      <TouchableOpacity
        onPress={props.onGoToNight}
        activeOpacity={0.85}
        style={styles.primaryBtn}
      >
        <Text style={styles.primaryBtnText}>Sang đêm tiếp theo ▸</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={props.onNewRound}
        activeOpacity={0.85}
        style={styles.secondaryBtn}
      >
        <Text style={styles.secondaryBtnText}>↺ Ván mới</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---- Endgame -------------------------------------------------------------

function Endgame({
  winner,
  players,
  roles,
  onNewRound,
}: {
  winner: "Sói" | "Dân";
  players: Player[];
  roles: ToolCard[];
  onNewRound: () => void;
}) {
  return (
    <View>
      <View
        style={[
          styles.winBanner,
          { backgroundColor: winner === "Sói" ? "#7C2929" : "#37412B" },
        ]}
      >
        <Text style={styles.winLabel}>KẾT THÚC</Text>
        <Text style={styles.winText}>Phe {winner} thắng!</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lộ tất cả vai trò</Text>
        <PlayerGrid
          players={players}
          selected={null}
          onTap={() => {}}
          showRoles={true}
          roles={roles}
        />
      </View>

      <TouchableOpacity
        onPress={onNewRound}
        activeOpacity={0.85}
        style={styles.primaryBtn}
      >
        <Text style={styles.primaryBtnText}>↺ Ván mới</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---- Player grid ---------------------------------------------------------

function PlayerGrid({
  players,
  selected,
  onTap,
  showRoles,
  roles,
}: {
  players: Player[];
  selected: string | null;
  onTap: (id: string) => void;
  showRoles: boolean;
  roles?: ToolCard[];
}) {
  const findRole = (id: string | null): ToolCard | undefined =>
    roles && id ? roles.find((r) => r.id === id) : undefined;

  return (
    <View style={styles.grid}>
      {players.map((p) => {
        const role = findRole(p.roleId);
        const isSelected = selected === p.id;
        return (
          <TouchableOpacity
            key={p.id}
            onPress={() => onTap(p.id)}
            activeOpacity={0.8}
            style={[
              styles.playerCell,
              !p.alive && styles.playerCellDead,
              isSelected && styles.playerCellSelected,
            ]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{p.id}</Text>
            </View>
            <Text
              style={[styles.playerName, !p.alive && styles.deadText]}
              numberOfLines={1}
            >
              {p.name}
            </Text>
            {showRoles && role && (
              <Text
                style={[
                  styles.playerRole,
                  role.faction === "Sói"
                    ? styles.factionWolf
                    : styles.factionVillager,
                ]}
                numberOfLines={1}
              >
                {role.name}
              </Text>
            )}
            {!p.alive && <Text style={styles.deadBadge}>✕ chết</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---- Stepper -------------------------------------------------------------

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

// ---- Helpers -------------------------------------------------------------

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => blankPlayer(i + 1));
}

function blankPlayer(num: number): Player {
  return {
    id: String(num),
    name: `Người ${num}`,
    roleId: null,
    alive: true,
  };
}

function defaultComposition(n: number): Record<string, number> {
  const r: Record<string, number> = {
    soi: 0,
    "tien-tri": 0,
    "bao-ve": 0,
    "phu-thuy": 0,
    "tho-san": 0,
    cupid: 0,
    dan: 0,
  };
  r.soi = Math.max(1, Math.floor(n / 4));
  if (n >= 6) r["tien-tri"] = 1;
  if (n >= 7) r["bao-ve"] = 1;
  if (n >= 8) r["phu-thuy"] = 1;
  if (n >= 9) r["tho-san"] = 1;
  if (n >= 12) r.cupid = 1;
  const used = sum(Object.values(r));
  r.dan = Math.max(0, n - used);
  return r;
}

function assignRoles(
  players: Player[],
  composition: Record<string, number>
): Player[] {
  const pool: string[] = [];
  for (const [roleId, count] of Object.entries(composition)) {
    for (let i = 0; i < count; i++) pool.push(roleId);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return players.map((p, idx) => ({
    ...p,
    roleId: pool[idx] ?? null,
    alive: true,
  }));
}

function checkWinner(
  players: Player[],
  roles: ToolCard[]
): "Sói" | "Dân" | null {
  const alive = players.filter((p) => p.alive);
  if (alive.length === 0) return null;
  const wolves = alive.filter((p) => {
    const r = roles.find((x) => x.id === p.roleId);
    return r?.faction === "Sói";
  }).length;
  // The game only ends after roles have been assigned.
  if (!players.every((p) => p.roleId)) return null;
  if (wolves === 0) return "Dân";
  if (wolves >= alive.length - wolves) return "Sói";
  return null;
}

function phaseLabel(phase: Phase, dayNum: number): string {
  if (phase === "setup") return "Thiết lập";
  if (phase === "night") return `Đêm ${dayNum}`;
  return `Ngày ${dayNum}`;
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

// ---- Styles --------------------------------------------------------------

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
    flexDirection: "row",
    alignItems: "center",
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
  aiTitle: { color: "#C5DC9E", fontSize: 13, fontWeight: "800", marginBottom: 4 },
  aiBody: { color: "#D8D2C8", fontSize: 13, lineHeight: 18 },

  card: {
    backgroundColor: "#3A3733",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowGap: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  cardTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  playerInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  playerInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    backgroundColor: "#2A2724",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 10,
  },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#5B7DB1",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },

  compTotal: {
    fontSize: 15,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  compTotalOk: { color: "#FFFFFF", backgroundColor: "#7FA650" },
  compTotalBad: { color: "#FFFFFF", backgroundColor: "#B33A3A" },

  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#4A4641",
    marginTop: 8,
  },
  roleName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  roleFaction: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  factionWolf: {
    color: "#FFCFCF",
    backgroundColor: "rgba(176,40,40,0.35)",
  },
  factionVillager: {
    color: "#C5DC9E",
    backgroundColor: "rgba(127,166,80,0.25)",
  },

  linkBtn: { marginTop: 10, alignItems: "center" },
  linkBtnText: { color: "#7FA650", fontSize: 13, fontWeight: "700" },

  primaryBtn: {
    backgroundColor: "#7C2929",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  secondaryBtn: {
    backgroundColor: "#4A4641",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  nightHeader: {
    backgroundColor: "#1F1D1B",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    alignItems: "center",
  },
  nightProgress: { color: "#A8A39B", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  nightRoleName: { color: "#FFFFFF", fontSize: 26, fontWeight: "800", marginTop: 4 },

  scriptLabel: { color: "#A8A39B", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  scriptText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    fontStyle: "italic",
  },

  gridHint: { color: "#A8A39B", fontSize: 12, marginVertical: 8 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  playerCell: {
    width: "33.33%",
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: "center",
  },
  playerCellSelected: {},
  playerCellDead: { opacity: 0.5 },
  playerName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  playerRole: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  deadText: { textDecorationLine: "line-through", color: "#888" },
  deadBadge: {
    fontSize: 10,
    color: "#FF8A8A",
    fontWeight: "700",
    marginTop: 2,
  },

  logEntry: {
    color: "#D8D2C8",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2724",
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  stepBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  stepValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    minWidth: 30,
    textAlign: "center",
  },

  winBanner: {
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: "center",
    marginBottom: 12,
  },
  winLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    opacity: 0.7,
  },
  winText: { color: "#FFFFFF", fontSize: 26, fontWeight: "800", marginTop: 4 },
});
