import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BoardRef,
  Card,
  Gem,
  GEMS,
  GameState,
  Noble,
  PlayerState,
  ReservedRef,
  TOKEN_LIMIT,
  Tier,
  Token,
  bonuses,
  canPurchase,
  canReserve,
  canTake2,
  canTake3,
  cardPoints,
  discardToken,
  eligibleNobles,
  finishTurn,
  applyAction,
  applyMove,
  score,
  setup,
  totalTokens,
  SeatConfig,
} from "./engine";
import { chooseMove } from "./ai";

type Props = { onBack: () => void };

// Visual identity for each token colour.
const GEM_UI: Record<Token, { bg: string; fg: string; vn: string }> = {
  diamond: { bg: "#E9E5DC", fg: "#2B2B2B", vn: "Kim cương" },
  sapphire: { bg: "#2E6FB7", fg: "#FFFFFF", vn: "Lam ngọc" },
  emerald: { bg: "#2E8B57", fg: "#FFFFFF", vn: "Lục bảo" },
  ruby: { bg: "#C0392B", fg: "#FFFFFF", vn: "Hồng ngọc" },
  onyx: { bg: "#39383D", fg: "#FFFFFF", vn: "Hắc ngọc" },
  gold: { bg: "#D4AF37", fg: "#2B2B2B", vn: "Vàng" },
};

const TIER_LABEL: Record<Tier, string> = { 1: "Cấp 1", 2: "Cấp 2", 3: "Cấp 3" };

export default function SplendorScreen({ onBack }: Props) {
  const [game, setGame] = useState<GameState | null>(null);
  const [picks, setPicks] = useState<Gem[]>([]);
  const [discarding, setDiscarding] = useState(false);
  const [cardModal, setCardModal] = useState<
    { ref: BoardRef | ReservedRef; card: Card } | null
  >(null);

  const startGame = (seats: SeatConfig[]) => {
    setGame(setup(seats));
    setPicks([]);
    setDiscarding(false);
    setCardModal(null);
  };

  // --- AI driver: when it's an AI's turn, play one move after a short beat. --
  useEffect(() => {
    if (!game || game.winner != null) return;
    if (!game.players[game.current].isAI) return;
    const t = setTimeout(() => {
      setGame((g) => {
        if (!g || g.winner != null) return g;
        if (!g.players[g.current].isAI) return g;
        return applyMove(g, chooseMove(g));
      });
    }, 750);
    return () => clearTimeout(t);
  }, [game]);

  if (!game) {
    return <SetupScreen onBack={onBack} onStart={startGame} />;
  }

  const me = game.players[game.current];
  const isHumanTurn = !me.isAI && game.winner == null && !discarding;

  // Advance after a human action, routing through the discard step if needed.
  const commit = (afterAction: GameState) => {
    setPicks([]);
    setCardModal(null);
    const cur = afterAction.players[afterAction.current];
    if (totalTokens(cur) > TOKEN_LIMIT) {
      setGame(afterAction);
      setDiscarding(true);
    } else {
      setGame(finishTurn(afterAction));
    }
  };

  const onTapBankGem = (g: Gem) => {
    if (!isHumanTurn || game.bank[g] <= 0) return;
    setPicks((cur) => {
      if (cur.includes(g)) return cur.filter((x) => x !== g);
      if (cur.length >= 3) return cur;
      return [...cur, g];
    });
  };

  const takeDistinct = () => {
    if (!canTake3(game, picks)) return;
    commit(applyAction(game, { type: "take3", colors: picks }));
  };
  const takeTwo = () => {
    if (picks.length !== 1 || !canTake2(game, picks[0])) return;
    commit(applyAction(game, { type: "take2", color: picks[0] }));
  };

  const onTapDiscard = (t: Token) => {
    const ns = discardToken(game, t);
    if (totalTokens(ns.players[ns.current]) <= TOKEN_LIMIT) {
      setDiscarding(false);
      setGame(finishTurn(ns));
    } else {
      setGame(ns);
    }
  };

  const doPurchase = () => {
    if (!cardModal || !canPurchase(game, cardModal.ref)) return;
    commit(applyAction(game, { type: "purchase", ref: cardModal.ref }));
  };
  const doReserve = () => {
    if (!cardModal || cardModal.ref.from !== "board") return;
    if (!canReserve(game, cardModal.ref)) return;
    commit(applyAction(game, { type: "reserve", ref: cardModal.ref }));
  };

  const turnLabel = game.winner != null
    ? "Kết thúc"
    : me.isAI
    ? `🤖 ${me.name} đang suy nghĩ…`
    : discarding
    ? `${me.name}: trả bớt ngọc`
    : `Lượt: ${me.name}`;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.side} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Splendor</Text>
        <TouchableOpacity
          onPress={() => setGame(null)}
          style={[styles.side, { alignItems: "flex-end" }]}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>Ván mới</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.turnPill, me.isAI && styles.turnPillAI]}>
        <Text style={styles.turnPillText}>{turnLabel}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Nobles ----------------------------------------------------------*/}
        <SectionLabel text={`Quý tộc · ${game.nobles.length}`} />
        <View style={styles.nobleRow}>
          {game.nobles.map((n) => (
            <NobleTile key={n.id} noble={n} />
          ))}
          {game.nobles.length === 0 && (
            <Text style={styles.muted}>Đã hết quý tộc</Text>
          )}
        </View>

        {/* Bank ------------------------------------------------------------*/}
        <SectionLabel text="Kho ngọc" />
        <View style={styles.bankRow}>
          {([...GEMS, "gold"] as Token[]).map((t) => {
            const selected = t !== "gold" && picks.includes(t as Gem);
            return (
              <TokenChip
                key={t}
                token={t}
                count={game.bank[t]}
                selected={selected}
                disabled={t === "gold"}
                onPress={() => onTapBankGem(t as Gem)}
              />
            );
          })}
        </View>

        {/* Take / discard controls ----------------------------------------*/}
        {discarding ? (
          <View style={styles.actionBar}>
            <Text style={styles.actionHint}>
              Đang giữ {totalTokens(me)} ngọc — chạm để trả về kho cho tới khi còn{" "}
              {TOKEN_LIMIT}.
            </Text>
            <View style={styles.bankRow}>
              {([...GEMS, "gold"] as Token[]).map((t) => (
                <TokenChip
                  key={t}
                  token={t}
                  count={me.tokens[t]}
                  selected={false}
                  disabled={me.tokens[t] === 0}
                  onPress={() => me.tokens[t] > 0 && onTapDiscard(t)}
                />
              ))}
            </View>
          </View>
        ) : isHumanTurn ? (
          <View style={styles.actionBar}>
            <Text style={styles.actionHint}>
              {picks.length === 0
                ? "Chạm ngọc để lấy (3 khác màu, hoặc 2 cùng màu khi kho ≥ 4)."
                : `Đã chọn: ${picks.map((g) => GEM_UI[g].vn).join(", ")}`}
            </Text>
            <View style={styles.actionBtns}>
              <TouchableOpacity
                onPress={takeDistinct}
                disabled={!canTake3(game, picks)}
                activeOpacity={0.85}
                style={[styles.actBtn, !canTake3(game, picks) && styles.actBtnOff]}
              >
                <Text style={styles.actBtnText}>Lấy khác màu ({picks.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={takeTwo}
                disabled={picks.length !== 1 || !canTake2(game, picks[0])}
                activeOpacity={0.85}
                style={[
                  styles.actBtn,
                  (picks.length !== 1 || !canTake2(game, picks[0])) && styles.actBtnOff,
                ]}
              >
                <Text style={styles.actBtnText}>Lấy 2 cùng màu</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Card tiers (level 3 on top, like the real tableau) -------------*/}
        {([3, 2, 1] as Tier[]).map((tier) => (
          <View key={tier}>
            <SectionLabel
              text={`${TIER_LABEL[tier]} · còn úp ${game.decks[tier].length}`}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tierRow}
            >
              <DeckPile count={game.decks[tier].length} />
              {game.board[tier].map((card, i) =>
                card ? (
                  <CardView
                    key={card.id}
                    card={card}
                    affordable={canPurchase(game, { from: "board", tier, index: i })}
                    onPress={() =>
                      isHumanTurn &&
                      setCardModal({ ref: { from: "board", tier, index: i }, card })
                    }
                  />
                ) : (
                  <View key={`empty-${tier}-${i}`} style={[styles.card, styles.cardEmpty]} />
                )
              )}
            </ScrollView>
          </View>
        ))}

        {/* Players ---------------------------------------------------------*/}
        <SectionLabel text="Người chơi" />
        {game.players.map((p, i) => (
          <PlayerPanel
            key={p.id}
            player={p}
            isCurrent={i === game.current && game.winner == null}
            nobles={game.nobles}
            onTapReserved={
              i === game.current && isHumanTurn
                ? (idx) => {
                    const card = p.reserved[idx];
                    if (card) setCardModal({ ref: { from: "reserved", index: idx }, card });
                  }
                : undefined
            }
          />
        ))}

        {/* Log -------------------------------------------------------------*/}
        {game.log.length > 0 && (
          <>
            <SectionLabel text="Diễn biến" />
            <View style={styles.logBox}>
              {game.log.slice(-5).map((line, i) => (
                <Text key={i} style={styles.logLine}>
                  • {line}
                </Text>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Card action modal -------------------------------------------------*/}
      <Modal
        visible={cardModal != null}
        transparent
        animationType="fade"
        onRequestClose={() => setCardModal(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCardModal(null)}
        >
          <View style={styles.modalCard}>
            {cardModal && (
              <>
                <Text style={styles.modalTitle}>
                  {GEM_UI[cardModal.card.gem].vn} · {TIER_LABEL[cardModal.card.tier]}
                </Text>
                <View style={{ alignItems: "center", marginVertical: 10 }}>
                  <CardView card={cardModal.card} affordable={canPurchase(game, cardModal.ref)} onPress={() => {}} big />
                </View>
                <View style={styles.modalBtns}>
                  <TouchableOpacity
                    onPress={doPurchase}
                    disabled={!canPurchase(game, cardModal.ref)}
                    activeOpacity={0.85}
                    style={[
                      styles.modalBtn,
                      styles.modalBtnPrimary,
                      !canPurchase(game, cardModal.ref) && styles.actBtnOff,
                    ]}
                  >
                    <Text style={styles.modalBtnText}>Mua</Text>
                  </TouchableOpacity>
                  {cardModal.ref.from === "board" && (
                    <TouchableOpacity
                      onPress={doReserve}
                      disabled={!canReserve(game, cardModal.ref as BoardRef)}
                      activeOpacity={0.85}
                      style={[
                        styles.modalBtn,
                        styles.modalBtnSecondary,
                        !canReserve(game, cardModal.ref as BoardRef) && styles.actBtnOff,
                      ]}
                    >
                      <Text style={styles.modalBtnText}>Giữ +🟡</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => setCardModal(null)}
                    activeOpacity={0.85}
                    style={[styles.modalBtn, styles.modalBtnGhost]}
                  >
                    <Text style={styles.modalBtnText}>Đóng</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Endgame -----------------------------------------------------------*/}
      <Modal visible={game.winner != null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🏆 Kết thúc</Text>
            {[...game.players]
              .map((p, idx) => ({ p, idx, s: score(p) }))
              .sort((a, b) =>
                b.s - a.s || a.p.cards.length - b.p.cards.length
              )
              .map((row, rank) => (
                <View key={row.p.id} style={styles.standRow}>
                  <Text style={styles.standRank}>{rank + 1}</Text>
                  <Text style={styles.standName}>
                    {row.p.name}
                    {row.idx === game.winner ? " 👑" : ""}
                  </Text>
                  <Text style={styles.standScore}>
                    {row.s}đ · {row.p.cards.length} lá
                  </Text>
                </View>
              ))}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => setGame(null)}
                activeOpacity={0.85}
                style={[styles.modalBtn, styles.modalBtnPrimary]}
              >
                <Text style={styles.modalBtnText}>Chơi lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onBack}
                activeOpacity={0.85}
                style={[styles.modalBtn, styles.modalBtnGhost]}
              >
                <Text style={styles.modalBtnText}>Về danh sách</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ===========================================================================
// Setup screen
// ===========================================================================

function SetupScreen({
  onBack,
  onStart,
}: {
  onBack: () => void;
  onStart: (seats: SeatConfig[]) => void;
}) {
  const [count, setCount] = useState(3);
  const [seats, setSeats] = useState<SeatConfig[]>(() =>
    defaultSeats(3)
  );

  const setCountTo = (n: number) => {
    const clamped = Math.max(2, Math.min(4, n));
    setCount(clamped);
    setSeats((cur) => {
      const next = defaultSeats(clamped);
      // preserve existing edits where possible
      for (let i = 0; i < clamped && i < cur.length; i++) next[i] = cur[i];
      return next;
    });
  };

  const toggleAI = (i: number) =>
    setSeats((cur) =>
      cur.map((s, idx) => (idx === i ? { ...s, isAI: !s.isAI } : s))
    );
  const rename = (i: number, name: string) =>
    setSeats((cur) => cur.map((s, idx) => (idx === i ? { ...s, name } : s)));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.side} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Splendor</Text>
        <View style={styles.side} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text style={styles.setupBlurb}>
          Thu thập ngọc, mua mỏ ngọc để được chiết khấu và điểm uy tín. Ai đạt{" "}
          15 điểm trước sẽ kích hoạt vòng cuối — điểm cao nhất thắng.
        </Text>

        <View style={styles.setupCard}>
          <View style={styles.row}>
            <Text style={styles.setupLabel}>Số người chơi</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                onPress={() => setCountTo(count - 1)}
                style={styles.stepBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{count}</Text>
              <TouchableOpacity
                onPress={() => setCountTo(count + 1)}
                style={styles.stepBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {seats.map((s, i) => (
          <View key={i} style={styles.seatRow}>
            <Text style={styles.seatIndex}>{i + 1}</Text>
            <TextInput
              style={styles.seatInput}
              value={s.name}
              onChangeText={(t) => rename(i, t)}
              placeholder={`Ghế ${i + 1}`}
              placeholderTextColor="#7A736A"
              maxLength={14}
            />
            <TouchableOpacity
              onPress={() => toggleAI(i)}
              activeOpacity={0.8}
              style={[styles.typeToggle, s.isAI ? styles.typeAI : styles.typeHuman]}
            >
              <Text style={styles.typeToggleText}>{s.isAI ? "🤖 Máy" : "🧑 Người"}</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          onPress={() => onStart(seats)}
          activeOpacity={0.85}
          style={styles.startBtn}
        >
          <Text style={styles.startBtnText}>Bắt đầu ván ▸</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function defaultSeats(n: number): SeatConfig[] {
  return Array.from({ length: n }, (_, i) => ({
    name: i === 0 ? "Bạn" : `Máy ${i}`,
    isAI: i !== 0,
  }));
}

// ===========================================================================
// Presentational pieces
// ===========================================================================

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function TokenChip({
  token,
  count,
  selected,
  disabled,
  onPress,
}: {
  token: Token;
  count: number;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const ui = GEM_UI[token];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.7}
      style={[
        styles.token,
        { backgroundColor: ui.bg },
        selected && styles.tokenSelected,
        count === 0 && styles.tokenEmpty,
      ]}
    >
      <Text style={[styles.tokenCount, { color: ui.fg }]}>{count}</Text>
    </TouchableOpacity>
  );
}

function CostPips({ cost, fg }: { cost: Record<Gem, number>; fg?: string }) {
  return (
    <View style={styles.costCol}>
      {GEMS.filter((g) => cost[g] > 0).map((g) => (
        <View key={g} style={[styles.costPip, { backgroundColor: GEM_UI[g].bg }]}>
          <Text style={[styles.costPipText, { color: GEM_UI[g].fg }]}>{cost[g]}</Text>
        </View>
      ))}
    </View>
  );
}

function CardView({
  card,
  affordable,
  onPress,
  big,
}: {
  card: Card;
  affordable: boolean;
  onPress: () => void;
  big?: boolean;
}) {
  const ui = GEM_UI[card.gem];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, big && styles.cardBig, affordable && styles.cardAffordable]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardPoints}>{card.points > 0 ? card.points : ""}</Text>
        <View style={[styles.cardGem, { backgroundColor: ui.bg }]} />
      </View>
      <CostPips cost={card.cost} />
    </TouchableOpacity>
  );
}

function DeckPile({ count }: { count: number }) {
  return (
    <View style={[styles.card, styles.deckPile]}>
      <Text style={styles.deckCount}>{count}</Text>
      <Text style={styles.deckLabel}>úp</Text>
    </View>
  );
}

function NobleTile({ noble }: { noble: Noble }) {
  return (
    <View style={styles.nobleTile}>
      <Text style={styles.noblePts}>{noble.points}</Text>
      <View style={styles.nobleReqs}>
        {GEMS.filter((g) => noble.req[g] > 0).map((g) => (
          <View key={g} style={[styles.nobleReq, { backgroundColor: GEM_UI[g].bg }]}>
            <Text style={[styles.nobleReqText, { color: GEM_UI[g].fg }]}>
              {noble.req[g]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PlayerPanel({
  player,
  isCurrent,
  nobles,
  onTapReserved,
}: {
  player: PlayerState;
  isCurrent: boolean;
  nobles: Noble[];
  onTapReserved?: (idx: number) => void;
}) {
  const bon = bonuses(player);
  const eligible = eligibleNobles(player, nobles);
  return (
    <View style={[styles.playerPanel, isCurrent && styles.playerPanelActive]}>
      <View style={styles.playerHeader}>
        <Text style={styles.playerName}>
          {player.isAI ? "🤖 " : ""}
          {player.name}
        </Text>
        <Text style={styles.playerScore}>{score(player)}đ</Text>
      </View>

      {/* Bonuses + held tokens, one row per gem colour */}
      <View style={styles.statGrid}>
        {GEMS.map((g) => (
          <View key={g} style={styles.statCell}>
            <View style={[styles.statDot, { backgroundColor: GEM_UI[g].bg }]} />
            <Text style={styles.statText}>
              {bon[g]}
              <Text style={styles.statTokens}> +{player.tokens[g]}</Text>
            </Text>
          </View>
        ))}
        <View style={styles.statCell}>
          <View style={[styles.statDot, { backgroundColor: GEM_UI.gold.bg }]} />
          <Text style={styles.statText}>{player.tokens.gold}</Text>
        </View>
      </View>

      <Text style={styles.playerMeta}>
        Bài: {player.cards.length} ({cardPoints(player)}đ) · Quý tộc:{" "}
        {player.nobles.length} · Giữ: {player.reserved.length}/3
        {eligible.length > 0 && isCurrent ? "  · ✨ sắp có quý tộc" : ""}
      </Text>

      {player.reserved.length > 0 && (
        <View style={styles.reservedRow}>
          {player.reserved.map((c, idx) => (
            <ReservedMini
              key={c.id}
              card={c}
              onPress={onTapReserved ? () => onTapReserved(idx) : undefined}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function ReservedMini({ card, onPress }: { card: Card; onPress?: () => void }) {
  const ui = GEM_UI[card.gem];
  return (
    <TouchableOpacity
      disabled={!onPress}
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.reservedMini, { borderColor: ui.bg }]}
    >
      <Text style={styles.reservedMiniPts}>{card.points || ""}</Text>
      <View style={[styles.reservedMiniGem, { backgroundColor: ui.bg }]} />
      <CostPips cost={card.cost} />
    </TouchableOpacity>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#262421" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  side: { width: 92, paddingVertical: 4 },
  backText: { fontSize: 15, fontWeight: "700", color: "#7FA650" },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#F2F2F2",
    textAlign: "center",
  },

  turnPill: {
    alignSelf: "center",
    marginVertical: 6,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#37412B",
  },
  turnPillAI: { backgroundColor: "#3A3140" },
  turnPillText: { color: "#F2F2F2", fontWeight: "700", fontSize: 13 },

  scroll: { flex: 1, paddingHorizontal: 12 },

  sectionLabel: {
    color: "#A8A39B",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 6,
  },
  muted: { color: "#7A736A", fontSize: 13, fontStyle: "italic" },

  // nobles
  nobleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  nobleTile: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: "#EFE7DA",
    padding: 4,
    justifyContent: "space-between",
  },
  noblePts: { fontSize: 16, fontWeight: "900", color: "#7A5A2A" },
  nobleReqs: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  nobleReq: {
    width: 15,
    height: 15,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  nobleReqText: { fontSize: 9, fontWeight: "800" },

  // bank
  bankRow: { flexDirection: "row", justifyContent: "space-between" },
  token: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.25)",
  },
  tokenSelected: { borderColor: "#FFD25A", borderWidth: 3 },
  tokenEmpty: { opacity: 0.35 },
  tokenCount: { fontSize: 18, fontWeight: "900" },

  // action bar
  actionBar: {
    marginTop: 10,
    backgroundColor: "#322F2B",
    borderRadius: 10,
    padding: 10,
  },
  actionHint: { color: "#D8D2C8", fontSize: 12.5, marginBottom: 8 },
  actionBtns: { flexDirection: "row", gap: 8 },
  actBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#D4954A",
    alignItems: "center",
  },
  actBtnOff: { opacity: 0.35 },
  actBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },

  // cards
  tierRow: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  card: {
    width: 74,
    height: 104,
    borderRadius: 9,
    backgroundColor: "#EFE7DA",
    padding: 6,
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardBig: { width: 104, height: 150, padding: 9 },
  cardEmpty: { backgroundColor: "#2E2B28", borderColor: "#3A3733" },
  cardAffordable: { borderColor: "#7FA650" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardPoints: { fontSize: 20, fontWeight: "900", color: "#2B2B2B" },
  cardGem: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
  },
  costCol: { gap: 3, alignItems: "flex-start" },
  costPip: {
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
  },
  costPipText: { fontSize: 11, fontWeight: "800" },

  deckPile: {
    backgroundColor: "#4A4641",
    alignItems: "center",
    justifyContent: "center",
  },
  deckCount: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  deckLabel: { color: "#C9C3B9", fontSize: 11, fontWeight: "700" },

  // players
  playerPanel: {
    backgroundColor: "#322F2B",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  playerPanelActive: { borderColor: "#D4954A", backgroundColor: "#3A3733" },
  playerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playerName: { color: "#F2F2F2", fontSize: 16, fontWeight: "800" },
  playerScore: { color: "#FFD25A", fontSize: 18, fontWeight: "900" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  statCell: { flexDirection: "row", alignItems: "center", gap: 4 },
  statDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.25)",
  },
  statText: { color: "#F2F2F2", fontSize: 13, fontWeight: "800" },
  statTokens: { color: "#9CC7E0", fontWeight: "700" },
  playerMeta: { color: "#A8A39B", fontSize: 12, marginTop: 8 },

  reservedRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  reservedMini: {
    width: 50,
    height: 70,
    borderRadius: 7,
    backgroundColor: "#EFE7DA",
    padding: 4,
    justifyContent: "space-between",
    borderWidth: 2,
  },
  reservedMiniPts: { fontSize: 13, fontWeight: "900", color: "#2B2B2B" },
  reservedMiniGem: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // log
  logBox: { backgroundColor: "#2E2B28", borderRadius: 8, padding: 10 },
  logLine: { color: "#C9C3B9", fontSize: 12, marginBottom: 3 },

  // setup
  setupBlurb: { color: "#C9C3B9", fontSize: 14, lineHeight: 20, marginBottom: 16 },
  setupCard: { backgroundColor: "#322F2B", borderRadius: 10, padding: 14, marginBottom: 14 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  setupLabel: { color: "#F2F2F2", fontSize: 16, fontWeight: "700" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#4A4641",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  stepValue: { color: "#FFFFFF", fontSize: 22, fontWeight: "900", minWidth: 24, textAlign: "center" },

  seatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#322F2B",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  seatIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#4A4641",
    color: "#FFFFFF",
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 26,
  },
  seatInput: {
    flex: 1,
    backgroundColor: "#262421",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#F2F2F2",
    fontSize: 15,
    fontWeight: "600",
  },
  typeToggle: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  typeHuman: { backgroundColor: "#37412B" },
  typeAI: { backgroundColor: "#3A3140" },
  typeToggleText: { color: "#F2F2F2", fontSize: 13, fontWeight: "800" },

  startBtn: {
    marginTop: 16,
    backgroundColor: "#D4954A",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },
  startBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },

  // modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#322F2B",
    borderRadius: 14,
    padding: 18,
  },
  modalTitle: { color: "#F2F2F2", fontSize: 18, fontWeight: "800", textAlign: "center" },
  modalBtns: { flexDirection: "row", gap: 8, marginTop: 14 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  modalBtnPrimary: { backgroundColor: "#7FA650" },
  modalBtnSecondary: { backgroundColor: "#5B7DB1" },
  modalBtnGhost: { backgroundColor: "#4A4641" },
  modalBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },

  standRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#403C37",
  },
  standRank: { color: "#D4954A", fontSize: 16, fontWeight: "900", width: 20 },
  standName: { flex: 1, color: "#F2F2F2", fontSize: 15, fontWeight: "700" },
  standScore: { color: "#A8A39B", fontSize: 13, fontWeight: "700" },
});
