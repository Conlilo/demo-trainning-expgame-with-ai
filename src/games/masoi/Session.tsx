import React, { useMemo, useState } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ToolCard, ToolGame } from "../../tools/data";
import Header from "./components/Header";
import FactionRevealModal from "./components/FactionRevealModal";
import LoverRevealModal from "./components/LoverRevealModal";
import SetupCountView from "./views/SetupCountView";
import SetupNamesView from "./views/SetupNamesView";
import SetupDeckView from "./views/SetupDeckView";
import NightView from "./views/NightView";
import DayView from "./views/DayView";
import EndgameView from "./views/EndgameView";
import { DAN_ID } from "./constants";
import {
  applyChains,
  applyNightDeaths,
  blankPlayer,
  checkWinner,
  defaultComposition,
  makePlayers,
  phaseLabel,
  sum,
} from "./helpers";
import { styles } from "./styles";
import type {
  LoverReveal,
  NightSubStep,
  Phase,
  Player,
  Reveal,
} from "./types";

type Props = {
  game: ToolGame;
  onBack: () => void;
};

export default function Session({ game, onBack }: Props) {
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

  // Reveal modals
  const [reveal, setReveal] = useState<Reveal>(null);
  const [loverReveal, setLoverReveal] = useState<LoverReveal>(null);

  // Night 1: include every role the GM put in the deck.
  // Later nights: only roles with at least one alive player.
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

  const witchBittenPlayers = useMemo(
    () => players.filter((p) => p.alive && p.statuses.includes("bitten")),
    [players]
  );

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

  const updatePlayerName = (id: string, name: string): void => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

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
    setLoverReveal(null);
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
        if (max === 1) return [playerId];
        return prev;
      }
      return [...prev, playerId];
    });
  };

  // ---- Night action: confirm/skip per role -------------------------------

  const logEntry = (entry: string): void => setLog((l) => [...l, entry]);

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

    if (role.id === "tien-tri") {
      const target = players.find((p) => p.id === selectedTargets[0]);
      const targetRole = roles.find((r) => r.id === target?.roleId);
      const faction: "Sói" | "Dân" =
        targetRole?.faction === "Sói" ? "Sói" : "Dân";
      setReveal({ playerId: selectedTargets[0], faction });
      return;
    }

    if (role.id === "cupid" && selectedTargets.length === 2) {
      setLoverReveal([selectedTargets[0], selectedTargets[1]]);
      return;
    }

    advanceFromAction();
  };

  /** Mutate players based on what role just acted. */
  const applyRoleAction = (role: ToolCard, targetIds: string[]): void => {
    if (role.id === "soi") {
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
  };

  const onRevealClose = (): void => {
    setReveal(null);
    advanceFromAction();
  };

  const onLoverRevealClose = (): void => {
    setLoverReveal(null);
    advanceFromAction();
  };

  // ---- Phù thủy actions ---------------------------------------------------

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
      if (dayNum === 1) {
        list = list.map((p) =>
          p.roleId == null ? { ...p, roleId: DAN_ID } : p
        );
      }
      list = applyNightDeaths(list);
      list = applyChains(list, hunterTargetId, lovers);
      return list;
    });
    setPhase("day");
  };

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
    setLoverReveal(null);
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
    setLoverReveal(null);
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
            <EndgameView
              winner={winner}
              players={players}
              roles={roles}
              onNewRound={newRound}
            />
          ) : phase === "setup-count" ? (
            <SetupCountView
              players={players}
              onAdjustPlayers={adjustPlayerCount}
              onContinue={() => setPhase("setup-names")}
            />
          ) : phase === "setup-names" ? (
            <SetupNamesView
              players={players}
              onChangeName={updatePlayerName}
              onBack={() => setPhase("setup-count")}
              onContinue={() => setPhase("setup-deck")}
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
              onBack={() => setPhase("setup-names")}
              onStart={startGame}
            />
          ) : phase === "night" ? (
            <NightView
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

      <FactionRevealModal
        reveal={reveal}
        players={players}
        onClose={onRevealClose}
      />
      <LoverRevealModal
        loverReveal={loverReveal}
        players={players}
        onClose={onLoverRevealClose}
      />
    </SafeAreaView>
  );
}
