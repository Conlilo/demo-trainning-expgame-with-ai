import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { findToolGame, ToolCard, ToolGame } from "../tools/data";

type Props = {
  gameId: string;
  onBack: () => void;
};

type Phase = "setup-count" | "setup-deck" | "night" | "day";
type NightSubStep = "identify" | "action";

type PlayerStatus =
  | "lover"
  | "bitten"
  | "protected"
  | "poisoned"
  | "revived"
  | "hunted-target";

type Player = {
  id: string;
  name: string;
  roleId: string | null;
  alive: boolean;
  statuses: PlayerStatus[];
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const DAN_ID = "dan";

/** Status visuals — used for border colour and the sub-label under each seat. */
const STATUS_VISUAL: Record<PlayerStatus, { color: string; label: string }> = {
  bitten: { color: "#D32F2F", label: "Bị cắn" },
  protected: { color: "#1E88E5", label: "Được bảo vệ" },
  poisoned: { color: "#8E24AA", label: "Bị hạ độc" },
  revived: { color: "#43A047", label: "Được hồi sinh" },
  "hunted-target": { color: "#EF6C00", label: "Bị treo thưởng" },
  lover: { color: "#EC407A", label: "Người yêu" },
};

/** When a player has multiple statuses, the first one in this list wins. */
const STATUS_PRIORITY: PlayerStatus[] = [
  "revived",
  "protected",
  "bitten",
  "poisoned",
  "hunted-target",
  "lover",
];

function topStatus(statuses: PlayerStatus[]): PlayerStatus | null {
  for (const s of STATUS_PRIORITY) if (statuses.includes(s)) return s;
  return null;
}

export default function MaSoiSessionScreen(props: Props) {
  const game = findToolGame(props.gameId);
  if (!game) return <NotFound onBack={props.onBack} />;
  return <Session game={game} {...props} />;
}

function Session({ game, onBack }: Props & { game: ToolGame }) {
  const roles = game.cards;
  const nightRoles = useMemo(
    () =>
      roles
        .filter((r) => r.nightOrder != null)
        .sort((a, b) => (a.nightOrder ?? 0) - (b.nightOrder ?? 0)),
    [game.id]
  );

  const [phase, setPhase] = useState<Phase>("setup-count");
  const [dayNum, setDayNum] = useState(1);
  const [players, setPlayers] = useState<Player[]>(() =>
    makePlayers(game.defaultPlayers)
  );
  const [composition, setComposition] = useState<Record<string, number>>(() =>
    defaultComposition(game.defaultPlayers, roles)
  );
  const [nightStep, setNightStep] = useState(0);
  const [nightSubStep, setNightSubStep] = useState<NightSubStep>("identify");
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [revealRoles, setRevealRoles] = useState(true);

  // Game-long effects
  const [hunterTargetId, setHunterTargetId] = useState<string | null>(null);
  const [lovers, setLovers] = useState<[string, string] | null>(null);
  const [witchHealUsed, setWitchHealUsed] = useState(false);
  const [witchPoisonUsed, setWitchPoisonUsed] = useState(false);

  // Tiên tri reveal modal (shown after picking a target).
  const [reveal, setReveal] = useState<{
    playerId: string;
    faction: "Sói" | "Dân";
  } | null>(null);

  // Night 1: include every role the GM put in the deck (no players identified
  // yet). Later nights: only roles with at least one alive player.
  const nightTurns = useMemo(() => {
    return nightRoles.filter((r) => {
      if (dayNum === 1) return (composition[r.id] ?? 0) > 0;
      if (r.onlyFirstNight) return false;
      return players.some((p) => p.alive && p.roleId === r.id);
    });
  }, [nightRoles, players, dayNum, composition]);

  const currentNightRole = nightTurns[nightStep];

  const winner = useMemo(
    () => (phase === "day" ? checkWinner(players, roles) : null),
    [players, roles, phase]
  );

  const totalDeck = sum(Object.values(composition));
  const deckMatches = totalDeck === players.length;
  const hasSoi = (composition["soi"] ?? 0) > 0;

  // ---- Setup actions ------------------------------------------------------

  const adjustPlayerCount = (delta: number): void => {
    const next = Math.max(4, Math.min(16, players.length + delta));
    if (next === players.length) return;
    setPlayers((prev) => {
      if (next > prev.length) {
        const extras = Array.from({ length: next - prev.length }, (_, i) =>
          blankPlayer(prev.length + i + 1)
        );
        return [...prev, ...extras];
      }
      return prev.slice(0, next);
    });
    setComposition((prev) => {
      const others = sum(
        Object.entries(prev)
          .filter(([id]) => id !== DAN_ID)
          .map(([, n]) => n)
      );
      return { ...prev, [DAN_ID]: Math.max(0, next - others) };
    });
  };

  const adjustRoleCount = (roleId: string, delta: number): void => {
    setComposition((prev) => {
      const cur = prev[roleId] ?? 0;
      return { ...prev, [roleId]: Math.max(0, cur + delta) };
    });
  };

  const resetComposition = (): void =>
    setComposition(defaultComposition(players.length, roles));

  const goToSetupDeck = (): void => setPhase("setup-deck");
  const goToSetupCount = (): void => setPhase("setup-count");

  const startGame = (): void => {
    setPhase("night");
    setDayNum(1);
    setNightStep(0);
    setSelectedTargets([]);
    setLog([]);
    setNightSubStep("identify");
    setHunterTargetId(null);
    setLovers(null);
    setWitchHealUsed(false);
    setWitchPoisonUsed(false);
    setReveal(null);
    setPlayers((prev) =>
      prev.map((p) => ({ ...p, roleId: null, alive: true, statuses: [] }))
    );
  };

  // ---- Night identify -----------------------------------------------------

  const toggleIdentifyMark = (playerId: string): void => {
    const role = currentNightRole;
    if (!role) return;
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== playerId) return p;
        if (p.roleId === role.id) return { ...p, roleId: null };
        if (p.roleId == null) {
          const have = prev.filter((x) => x.roleId === role.id).length;
          const max = composition[role.id] ?? 0;
          if (have >= max) return p;
          return { ...p, roleId: role.id };
        }
        return p; // locked
      })
    );
  };

  const onIdentifyContinue = (): void => {
    setSelectedTargets([]);
    setNightSubStep("action");
  };

  // ---- Night action: target selection -------------------------------------

  const onSelectTarget = (playerId: string): void => {
    const role = currentNightRole;
    if (!role) return;
    const max = role.actionTargets ?? 1;
    setSelectedTargets((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      if (prev.length >= max) {
        if (max === 1) return [playerId]; // replace for single-select
        return prev; // ignore extra for multi-select
      }
      return [...prev, playerId];
    });
  };

  // ---- Night action: confirm/skip per role -------------------------------

  const onActionAdvance = (action: "act" | "skip"): void => {
    const role = currentNightRole;
    if (!role) return advanceFromAction();

    if (action === "skip" || selectedTargets.length === 0) {
      logEntry(`Đêm ${dayNum} · ${role.name} bỏ qua`);
      advanceFromAction();
      return;
    }

    applyRoleAction(role, selectedTargets);

    const targetNames = selectedTargets
      .map((id) => players.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(", ");
    logEntry(`Đêm ${dayNum} · ${role.name} → ${targetNames}`);

    // Tiên tri shows a faction-reveal modal before moving on.
    if (role.id === "tien-tri") {
      const target = players.find((p) => p.id === selectedTargets[0]);
      const targetRole = roles.find((r) => r.id === target?.roleId);
      const faction: "Sói" | "Dân" =
        targetRole?.faction === "Sói" ? "Sói" : "Dân";
      setReveal({ playerId: selectedTargets[0], faction });
      return; // advance happens when the modal closes
    }

    advanceFromAction();
  };

  /** Mutate players based on what role just acted. */
  const applyRoleAction = (role: ToolCard, targetIds: string[]): void => {
    if (role.id === "soi") {
      // Only one bitten per night — clear any old (shouldn't exist; just in case).
      setPlayers((prev) =>
        prev.map((p) => {
          const cleared = p.statuses.filter((s) => s !== "bitten");
          return targetIds.includes(p.id)
            ? { ...p, statuses: [...cleared, "bitten"] }
            : { ...p, statuses: cleared };
        })
      );
    } else if (role.id === "bao-ve") {
      setPlayers((prev) =>
        prev.map((p) => {
          const cleared = p.statuses.filter((s) => s !== "protected");
          return targetIds.includes(p.id)
            ? { ...p, statuses: [...cleared, "protected"] }
            : { ...p, statuses: cleared };
        })
      );
    } else if (role.id === "cupid") {
      setPlayers((prev) =>
        prev.map((p) =>
          targetIds.includes(p.id) && !p.statuses.includes("lover")
            ? { ...p, statuses: [...p.statuses, "lover"] }
            : p
        )
      );
      if (targetIds.length === 2) {
        setLovers([targetIds[0], targetIds[1]]);
      }
    } else if (role.id === "tho-san") {
      const targetId = targetIds[0];
      setHunterTargetId(targetId);
      setPlayers((prev) =>
        prev.map((p) => {
          const cleared = p.statuses.filter((s) => s !== "hunted-target");
          return p.id === targetId
            ? { ...p, statuses: [...cleared, "hunted-target"] }
            : { ...p, statuses: cleared };
        })
      );
    }
    // tien-tri: no persistent status applied
  };

  const onRevealClose = (): void => {
    setReveal(null);
    advanceFromAction();
  };

  // ---- Phù thủy actions ---------------------------------------------------

  const witchBittenPlayers = useMemo(
    () => players.filter((p) => p.alive && p.statuses.includes("bitten")),
    [players]
  );

  const onWitchHeal = (targetId: string): void => {
    if (witchHealUsed) return;
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === targetId && !p.statuses.includes("revived")
          ? { ...p, statuses: [...p.statuses, "revived"] }
          : p
      )
    );
    setWitchHealUsed(true);
    const name = players.find((p) => p.id === targetId)?.name ?? "?";
    logEntry(`Đêm ${dayNum} · Phù thủy cứu ${name}`);
  };

  const onWitchPoison = (targetId: string): void => {
    if (witchPoisonUsed) return;
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === targetId && !p.statuses.includes("poisoned")
          ? { ...p, statuses: [...p.statuses, "poisoned"] }
          : p
      )
    );
    setWitchPoisonUsed(true);
    const name = players.find((p) => p.id === targetId)?.name ?? "?";
    logEntry(`Đêm ${dayNum} · Phù thủy đầu độc ${name}`);
  };

  const onWitchConfirm = (): void => {
    advanceFromAction();
  };

  // ---- Night progression --------------------------------------------------

  const advanceFromAction = (): void => {
    setSelectedTargets([]);
    const next = nightStep + 1;
    if (next >= nightTurns.length) {
      endNight();
      return;
    }
    setNightStep(next);
    setNightSubStep(dayNum === 1 ? "identify" : "action");
  };

  const endNight = (): void => {
    setPlayers((prev) => {
      let list = prev;
      // Night 1: anyone still unmarked is a plain villager.
      if (dayNum === 1) {
        list = list.map((p) => (p.roleId == null ? { ...p, roleId: DAN_ID } : p));
      }
      // Resolve deaths from this night's statuses, then chain.
      list = applyNightDeaths(list);
      list = applyChains(list, hunterTargetId, lovers);
      return list;
    });
    setPhase("day");
  };

  const logEntry = (entry: string): void => setLog((l) => [...l, entry]);

  // ---- Day actions --------------------------------------------------------

  const togglePlayerAlive = (id: string): void => {
    setPlayers((prev) => {
      const flipped = prev.map((p) =>
        p.id === id ? { ...p, alive: !p.alive } : p
      );
      return applyChains(flipped, hunterTargetId, lovers);
    });
  };

  const goToNextNight = (): void => {
    // Clear transient statuses; keep "lover" (permanent) and "hunted-target"
    // until the Hunter re-marks during their next action.
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        statuses: p.statuses.filter(
          (s) => s === "lover" || s === "hunted-target"
        ),
      }))
    );
    setPhase("night");
    setDayNum((d) => d + 1);
    setNightStep(0);
    setSelectedTargets([]);
    setNightSubStep("action");
    setReveal(null);
  };

  const newRound = (): void => {
    setPhase("setup-deck");
    setDayNum(1);
    setNightStep(0);
    setSelectedTargets([]);
    setLog([]);
    setHunterTargetId(null);
    setLovers(null);
    setWitchHealUsed(false);
    setWitchPoisonUsed(false);
    setReveal(null);
    setPlayers((prev) =>
      prev.map((p) => ({ ...p, alive: true, roleId: null, statuses: [] }))
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
          ) : phase === "setup-count" ? (
            <SetupCountView
              players={players}
              onAdjustPlayers={adjustPlayerCount}
              onContinue={goToSetupDeck}
            />
          ) : phase === "setup-deck" ? (
            <SetupDeckView
              players={players}
              roles={roles}
              composition={composition}
              totalDeck={totalDeck}
              matches={deckMatches}
              hasSoi={hasSoi}
              onAdjustRole={adjustRoleCount}
              onReset={resetComposition}
              onBack={goToSetupCount}
              onStart={startGame}
            />
          ) : phase === "night" ? (
            <NightView
              dayNum={dayNum}
              nightStep={nightStep}
              nightTurns={nightTurns}
              currentRole={currentNightRole}
              composition={composition}
              players={players}
              roles={roles}
              substep={nightSubStep}
              selectedTargets={selectedTargets}
              witchHealUsed={witchHealUsed}
              witchPoisonUsed={witchPoisonUsed}
              witchBittenPlayers={witchBittenPlayers}
              onToggleIdentify={toggleIdentifyMark}
              onIdentifyContinue={onIdentifyContinue}
              onSelectTarget={onSelectTarget}
              onAdvance={onActionAdvance}
              onWitchHeal={onWitchHeal}
              onWitchPoison={onWitchPoison}
              onWitchConfirm={onWitchConfirm}
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

      <FactionRevealModal reveal={reveal} players={players} onClose={onRevealClose} />
    </SafeAreaView>
  );
}

// ---- Header --------------------------------------------------------------

function Header({ title, onBack }: { title: string; onBack: () => void }) {
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

// ---- Setup count ---------------------------------------------------------

function SetupCountView({
  players,
  onAdjustPlayers,
  onContinue,
}: {
  players: Player[];
  onAdjustPlayers: (delta: number) => void;
  onContinue: () => void;
}) {
  return (
    <View>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Số người chơi</Text>
          <Stepper value={players.length} onDelta={onAdjustPlayers} />
        </View>
        <Text style={styles.gridHint}>
          Mỗi vòng là 1 ghế ngồi. Bước tiếp theo bạn sẽ chọn lá bài cho ván.
        </Text>
        <CircleBoard
          players={players}
          centerLabel="người chơi"
          size={Math.min(SCREEN_WIDTH - 64, 360)}
        />
      </View>

      <TouchableOpacity
        onPress={onContinue}
        activeOpacity={0.85}
        style={styles.primaryBtn}
      >
        <Text style={styles.primaryBtnText}>Tiếp tục ▸</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---- Setup deck ----------------------------------------------------------

function SetupDeckView(props: {
  players: Player[];
  roles: ToolCard[];
  composition: Record<string, number>;
  totalDeck: number;
  matches: boolean;
  hasSoi: boolean;
  onAdjustRole: (roleId: string, delta: number) => void;
  onReset: () => void;
  onBack: () => void;
  onStart: () => void;
}) {
  const {
    players,
    roles,
    composition,
    totalDeck,
    matches,
    hasSoi,
    onAdjustRole,
    onReset,
    onBack,
    onStart,
  } = props;

  const canStart = matches && hasSoi;

  return (
    <View>
      <TouchableOpacity onPress={onBack} style={styles.subBackBtn} activeOpacity={0.7}>
        <Text style={styles.subBackText}>‹ Đổi số người chơi</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Lá bài trong ván</Text>
          <Text
            style={[
              styles.compTotal,
              matches ? styles.compTotalOk : styles.compTotalBad,
            ]}
          >
            {totalDeck} / {players.length}
          </Text>
        </View>
        <Text style={styles.gridHint}>
          Chọn bao nhiêu lá cho mỗi vai. Tổng phải khớp số người chơi.
        </Text>

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

        <TouchableOpacity onPress={onReset} activeOpacity={0.8} style={styles.linkBtn}>
          <Text style={styles.linkBtnText}>↺ Đặt lại theo gợi ý</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onStart}
        disabled={!canStart}
        activeOpacity={0.85}
        style={[styles.primaryBtn, !canStart && styles.primaryBtnDisabled]}
      >
        <Text style={styles.primaryBtnText}>
          {!hasSoi
            ? "Cần ít nhất 1 Sói"
            : !matches
            ? "Tổng lá chưa khớp số người chơi"
            : "Bắt đầu ván"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ---- Night ---------------------------------------------------------------

type NightViewProps = {
  dayNum: number;
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

function NightView(props: NightViewProps) {
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
          Chạm 1 người để gắn vai · chạm lại để bỏ. Người đã có vai khác bị
          khóa.
        </Text>
        <CircleBoard
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
          style={[
            styles.primaryBtn,
            !canContinue && styles.primaryBtnDisabled,
          ]}
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

  // substep === "action": dispatch by role
  if (currentRole.id === "phu-thuy") {
    return <PhuThuyAction {...props} />;
  }
  return <GenericAction {...props} />;
}

function GenericAction(props: NightViewProps) {
  const { nightStep, nightTurns, currentRole, players, selectedTargets } = props;
  if (!currentRole) return null;

  const targets = currentRole.actionTargets ?? 1;
  const remaining = targets - selectedTargets.length;

  return (
    <View>
      <RoleBanner
        step={nightStep}
        total={nightTurns.length}
        role={currentRole}
        tag={targets === 2 ? "Chọn 2 mục tiêu" : "Hành động"}
      />

      <View style={styles.card}>
        <Text style={styles.scriptLabel}>LỜI DẪN</Text>
        <Text style={styles.scriptText}>{currentRole.nightInstruction}</Text>
        {targets > 1 && (
          <Text style={styles.identifyCounter}>
            Đã chọn: {selectedTargets.length} / {targets}
          </Text>
        )}
      </View>

      <Text style={styles.gridHint}>
        {targets > 1
          ? `Chọn ${targets} người · chạm lại để bỏ.`
          : "Chọn mục tiêu (tùy chọn) — chạm 1 người chơi còn sống."}
      </Text>
      <CircleBoard
        players={players}
        roles={props.roles}
        selectedIds={selectedTargets}
        showRoles={true}
        onTap={props.onSelectTarget}
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
          disabled={targets > 1 && remaining > 0}
          activeOpacity={0.85}
          style={[
            styles.primaryBtn,
            { flex: 1, marginTop: 0 },
            targets > 1 && remaining > 0 && styles.primaryBtnDisabled,
          ]}
        >
          <Text style={styles.primaryBtnText}>
            {targets > 1 && remaining > 0
              ? `Chọn thêm ${remaining}`
              : "Xác nhận ▸"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PhuThuyAction(props: NightViewProps) {
  const {
    nightStep,
    nightTurns,
    currentRole,
    players,
    selectedTargets,
    witchHealUsed,
    witchPoisonUsed,
    witchBittenPlayers,
  } = props;
  const [poisonMode, setPoisonMode] = useState(false);
  if (!currentRole) return null;

  const noBitten = witchBittenPlayers.length === 0;
  const healDisabled = witchHealUsed || noBitten;

  return (
    <View>
      <RoleBanner
        step={nightStep}
        total={nightTurns.length}
        role={currentRole}
        tag="Hành động"
      />

      <View style={styles.card}>
        <Text style={styles.scriptLabel}>LỜI DẪN</Text>
        <Text style={styles.scriptText}>{currentRole.nightInstruction}</Text>
      </View>

      {/* Heal section */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Bình hồi sinh</Text>
          <Text
            style={[
              styles.potionStatus,
              witchHealUsed
                ? styles.potionStatusUsed
                : styles.potionStatusActive,
            ]}
          >
            {witchHealUsed ? "đã dùng" : "còn 1 bình"}
          </Text>
        </View>
        <Text style={styles.potionHint}>
          {witchHealUsed
            ? "Đã dùng ở đêm trước — không thể cứu thêm."
            : noBitten
            ? "Đêm nay Sói không cắn ai · không có người cần cứu."
            : witchBittenPlayers.length === 1
            ? `Chạm vào ${witchBittenPlayers[0].name} (viền đỏ) để cứu, hoặc bỏ qua.`
            : `Chạm 1 người bị cắn (viền đỏ) để cứu:`}
        </Text>
        <CircleBoard
          players={players}
          roles={props.roles}
          selectableIds={
            healDisabled ? [] : witchBittenPlayers.map((p) => p.id)
          }
          showRoles={true}
          onTap={props.onWitchHeal}
          size={Math.min(SCREEN_WIDTH - 64, 320)}
        />
      </View>

      {/* Poison section */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Bình thuốc độc</Text>
          <Text
            style={[
              styles.potionStatus,
              witchPoisonUsed
                ? styles.potionStatusUsed
                : styles.potionStatusActive,
            ]}
          >
            {witchPoisonUsed ? "đã dùng" : "còn 1 bình"}
          </Text>
        </View>
        {witchPoisonUsed ? (
          <Text style={styles.potionHint}>Đã dùng ở đêm trước.</Text>
        ) : !poisonMode ? (
          <TouchableOpacity
            onPress={() => setPoisonMode(true)}
            activeOpacity={0.85}
            style={[styles.potionBtn, styles.potionBtnPoison]}
          >
            <Text style={styles.potionBtnText}>Dùng bình thuốc độc</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <Text style={styles.potionHint}>
              Chọn 1 người để đầu độc:
            </Text>
            <CircleBoard
              players={players}
              roles={props.roles}
              selectedIds={selectedTargets}
              showRoles={true}
              onTap={props.onSelectTarget}
              size={Math.min(SCREEN_WIDTH - 64, 320)}
            />
            <View style={styles.rowGap}>
              <TouchableOpacity
                onPress={() => {
                  setPoisonMode(false);
                }}
                activeOpacity={0.8}
                style={[styles.secondaryBtn, { flex: 1 }]}
              >
                <Text style={styles.secondaryBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={selectedTargets.length !== 1}
                onPress={() => {
                  props.onWitchPoison(selectedTargets[0]);
                  setPoisonMode(false);
                }}
                activeOpacity={0.85}
                style={[
                  styles.primaryBtn,
                  { flex: 1, marginTop: 0 },
                  selectedTargets.length !== 1 && styles.primaryBtnDisabled,
                ]}
              >
                <Text style={styles.primaryBtnText}>Đầu độc</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={props.onWitchConfirm}
        activeOpacity={0.85}
        style={styles.primaryBtn}
      >
        <Text style={styles.primaryBtnText}>Xong · sang ngày ▸</Text>
      </TouchableOpacity>
    </View>
  );
}

function RoleBanner({
  step,
  total,
  role,
  tag,
}: {
  step: number;
  total: number;
  role: ToolCard;
  tag: string;
}) {
  return (
    <View style={styles.nightHeader}>
      <Text style={styles.nightProgress}>
        Vai {step + 1} / {total} · {tag}
      </Text>
      <Text style={styles.nightRoleName}>{role.name}</Text>
      <Text
        style={[
          styles.roleFaction,
          role.faction === "Sói" ? styles.factionWolf : styles.factionVillager,
        ]}
      >
        {role.group}
      </Text>
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
        <CircleBoard
          players={players}
          roles={roles}
          showRoles={revealRoles}
          onTap={props.onToggleAlive}
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
        <CircleBoard players={players} roles={roles} showRoles={true} />
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

// ---- Faction reveal modal (Tiên tri) -------------------------------------

function FactionRevealModal({
  reveal,
  players,
  onClose,
}: {
  reveal: { playerId: string; faction: "Sói" | "Dân" } | null;
  players: Player[];
  onClose: () => void;
}) {
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

// ---- Circle board --------------------------------------------------------

type CircleBoardProps = {
  players: Player[];
  size?: number;
  centerLabel?: string;
  /** Multi-selection: outlines all listed players. */
  selectedIds?: string[];
  markedRoleId?: string | null;
  lockOthers?: boolean;
  /** When set, only these players can be tapped; others appear dimmed. */
  selectableIds?: string[];
  showRoles?: boolean;
  roles?: ToolCard[];
  onTap?: (id: string) => void;
};

function CircleBoard({
  players,
  size,
  centerLabel = "còn sống",
  selectedIds = [],
  markedRoleId = null,
  lockOthers = false,
  selectableIds,
  showRoles = true,
  roles,
  onTap,
}: CircleBoardProps) {
  const W = size ?? Math.min(SCREEN_WIDTH - 32, 360);
  const seatR = players.length <= 8 ? 30 : players.length <= 12 ? 26 : 22;
  const margin = 14;
  const ringR = W / 2 - seatR - margin;
  const cx = W / 2;
  const cy = W / 2;

  const aliveCount = players.filter((p) => p.alive).length;
  const displayCount =
    centerLabel === "còn sống" ? aliveCount : players.length;
  const selectedSet = new Set(selectedIds);

  return (
    <View style={[styles.tableArea, { width: W, height: W }]}>
      <View style={styles.tableSurface} />
      <View style={styles.tableCenter}>
        <Text style={styles.tableCenterCount}>{displayCount}</Text>
        <Text style={styles.tableCenterLabel}>{centerLabel}</Text>
      </View>

      {players.map((p, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / players.length;
        const x = cx + ringR * Math.cos(angle);
        const y = cy + ringR * Math.sin(angle);
        const role = roles?.find((r) => r.id === p.roleId);
        const isSelected = selectedSet.has(p.id);
        const isLockedOther =
          lockOthers && p.roleId != null && p.roleId !== markedRoleId;
        const isUnselectable =
          selectableIds != null && !selectableIds.includes(p.id);
        const isDead = !p.alive;
        const disabled = isDead || isLockedOther || isUnselectable || !onTap;

        // Background by role faction (only when roles are revealed)
        let bgStyle: any = styles.seatDefault;
        if (showRoles && role) {
          if (role.faction === "Sói") bgStyle = styles.seatWolf;
          else if (role.id !== DAN_ID) bgStyle = styles.seatSpecial;
        }

        // Border + status colour from top-priority status
        const status = topStatus(p.statuses);
        const statusColor = status ? STATUS_VISUAL[status].color : undefined;

        // Sub-label priority: dead → status → role
        const subLabel = isDead
          ? "✕ chết"
          : status
          ? STATUS_VISUAL[status].label
          : showRoles && role
          ? role.name
          : isLockedOther && role
          ? role.name
          : null;

        return (
          <TouchableOpacity
            key={p.id}
            onPress={onTap ? () => onTap(p.id) : undefined}
            disabled={disabled}
            activeOpacity={0.7}
            style={{
              position: "absolute",
              left: x - seatR,
              top: y - seatR,
              width: seatR * 2,
              alignItems: "center",
              opacity: isDead
                ? 0.45
                : isLockedOther || isUnselectable
                ? 0.45
                : 1,
            }}
          >
            <View
              style={[
                styles.seat,
                {
                  width: seatR * 2,
                  height: seatR * 2,
                  borderRadius: seatR,
                },
                bgStyle,
                isSelected && styles.seatSelected,
                statusColor != null && {
                  borderColor: statusColor,
                  borderWidth: 3,
                },
              ]}
            >
              <Text style={[styles.seatNumber, { fontSize: seatR * 0.7 }]}>
                {p.id}
              </Text>
            </View>
            {subLabel != null && (
              <Text
                style={[
                  styles.seatSubLabel,
                  isDead && styles.deadText,
                  status != null && { color: STATUS_VISUAL[status].color },
                ]}
                numberOfLines={1}
              >
                {subLabel}
              </Text>
            )}
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
    statuses: [],
  };
}

function defaultComposition(
  n: number,
  roles: ToolCard[]
): Record<string, number> {
  const r: Record<string, number> = {};
  for (const role of roles) r[role.id] = 0;
  r.soi = Math.max(1, Math.floor(n / 4));
  if (n >= 6) r["tien-tri"] = 1;
  if (n >= 7) r["bao-ve"] = 1;
  if (n >= 8) r["phu-thuy"] = 1;
  if (n >= 9) r["tho-san"] = 1;
  if (n >= 12) r.cupid = 1;
  const used = sum(Object.values(r));
  r[DAN_ID] = Math.max(0, n - used);
  return r;
}

/** Bitten (not protected/revived) and Poisoned (not revived) players die. */
function applyNightDeaths(players: Player[]): Player[] {
  return players.map((p) => {
    if (!p.alive) return p;
    const revived = p.statuses.includes("revived");
    if (revived) return p;
    const protectedSelf = p.statuses.includes("protected");
    const bittenDies = p.statuses.includes("bitten") && !protectedSelf;
    const poisonedDies = p.statuses.includes("poisoned");
    return bittenDies || poisonedDies ? { ...p, alive: false } : p;
  });
}

/** Hunter / lover chains: keep applying until no more deaths cascade. */
function applyChains(
  players: Player[],
  hunterTargetId: string | null,
  lovers: [string, string] | null
): Player[] {
  let result = players;
  let changed = true;
  while (changed) {
    changed = false;

    // Hunter chain: if any Hunter (tho-san) just died, kill their marked target.
    const hunterDead = result.some(
      (p) => p.roleId === "tho-san" && !p.alive
    );
    if (hunterDead && hunterTargetId) {
      const target = result.find((p) => p.id === hunterTargetId);
      if (target && target.alive) {
        result = result.map((p) =>
          p.id === hunterTargetId ? { ...p, alive: false } : p
        );
        changed = true;
      }
    }

    // Lovers chain.
    if (lovers) {
      const [a, b] = lovers;
      const pa = result.find((p) => p.id === a);
      const pb = result.find((p) => p.id === b);
      if (pa && pb) {
        if (!pa.alive && pb.alive) {
          result = result.map((p) =>
            p.id === b ? { ...p, alive: false } : p
          );
          changed = true;
        }
        if (!pb.alive && pa.alive) {
          result = result.map((p) =>
            p.id === a ? { ...p, alive: false } : p
          );
          changed = true;
        }
      }
    }
  }
  return result;
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
  if (wolves === 0) return "Dân";
  if (wolves >= alive.length - wolves) return "Sói";
  return null;
}

function phaseLabel(phase: Phase, dayNum: number): string {
  if (phase === "setup-count") return "Số người chơi";
  if (phase === "setup-deck") return "Chọn lá bài";
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

  subBackBtn: { paddingVertical: 8, marginBottom: 4 },
  subBackText: { color: "#7FA650", fontSize: 14, fontWeight: "700" },

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
  rowGap: { flexDirection: "row", gap: 10, marginTop: 10 },
  cardTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  // --- Circle table
  tableArea: { alignSelf: "center", marginTop: 16, position: "relative" },
  tableSurface: {
    position: "absolute",
    left: "12%",
    top: "12%",
    right: "12%",
    bottom: "12%",
    borderRadius: 9999,
    backgroundColor: "#2F2C29",
    borderWidth: 1,
    borderColor: "#4A4641",
  },
  tableCenter: {
    position: "absolute",
    left: "30%",
    top: "30%",
    right: "30%",
    bottom: "30%",
    alignItems: "center",
    justifyContent: "center",
  },
  tableCenterCount: { color: "#F2F2F2", fontSize: 30, fontWeight: "800" },
  tableCenterLabel: { color: "#A8A39B", fontSize: 12, marginTop: 2 },

  // --- Seats
  seat: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  seatDefault: { backgroundColor: "#4A4641", borderColor: "#6B655E" },
  seatSpecial: { backgroundColor: "#3F5A2A", borderColor: "#7FA650" },
  seatWolf: { backgroundColor: "#5C1E1E", borderColor: "#B22222" },
  seatSelected: { borderColor: "#F9A825", borderWidth: 3 },
  seatNumber: { color: "#FFFFFF", fontWeight: "800" },
  seatSubLabel: {
    color: "#D8D2C8",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
    textAlign: "center",
  },

  // --- Deck composition
  compTotal: {
    fontSize: 15,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
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
    overflow: "hidden",
  },
  factionWolf: { color: "#FFCFCF", backgroundColor: "rgba(176,40,40,0.35)" },
  factionVillager: {
    color: "#C5DC9E",
    backgroundColor: "rgba(127,166,80,0.25)",
  },

  linkBtn: { marginTop: 10, alignItems: "center" },
  linkBtnText: { color: "#7FA650", fontSize: 13, fontWeight: "700" },

  // --- Buttons
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

  // --- Night banner
  nightHeader: {
    backgroundColor: "#1F1D1B",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    alignItems: "center",
  },
  nightProgress: {
    color: "#A8A39B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  nightRoleName: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
  },

  scriptLabel: {
    color: "#A8A39B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  scriptText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    fontStyle: "italic",
  },
  identifyCounter: {
    color: "#7FA650",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
  },

  // --- Witch
  potionStatus: {
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    textTransform: "uppercase",
    overflow: "hidden",
  },
  potionStatusActive: {
    color: "#FFFFFF",
    backgroundColor: "#43A047",
  },
  potionStatusUsed: {
    color: "#A8A39B",
    backgroundColor: "#4A4641",
  },
  potionHint: {
    color: "#D8D2C8",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  potionOptions: {
    marginTop: 10,
    gap: 8,
  },
  potionBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  potionBtnHeal: { backgroundColor: "#2E7D32" },
  potionBtnPoison: { backgroundColor: "#6A1B9A" },
  potionBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },

  // --- Day
  gridHint: { color: "#A8A39B", fontSize: 12, marginVertical: 8 },
  logEntry: {
    color: "#D8D2C8",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  deadText: { textDecorationLine: "line-through", color: "#888" },

  // --- Stepper
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

  // --- Endgame
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

  // --- Reveal modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  revealCard: {
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  revealLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    opacity: 0.8,
  },
  revealName: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
  },
  revealFaction: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  revealBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 20,
  },
  revealBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
