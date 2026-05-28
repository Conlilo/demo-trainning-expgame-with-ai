import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Xiangqi } from "./engine";
import type { Square } from "./engine";
import XiangqiBoard from "./XiangqiBoard";
import { findBestMove, Difficulty, DIFFICULTY_DEPTH } from "./ai";

const { width } = Dimensions.get("window");
const BOARD_WIDTH = Math.floor(Math.min(width - 24, 380));

type Mode = "ai" | "two";
const HUMAN: "r" = "r";

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Dễ",
  medium: "Vừa",
  hard: "Khó",
};

type Props = {
  onBack: () => void;
};

export default function XiangqiScreen({ onBack }: Props) {
  const gameRef = useRef(new Xiangqi());
  const game = gameRef.current;

  // Re-renders are driven by a monotonically increasing version counter:
  // every move/undo/new-game bumps it.
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [mode, setMode] = useState<Mode>("ai");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [thinking, setThinking] = useState(false);

  const sync = () => setVersion((v) => v + 1);
  const aiTurn = mode === "ai" && game.turn() !== HUMAN;

  const legalTargets = useMemo<Square[]>(() => {
    if (!selected) return [];
    return game.moves({ square: selected }).map((m) => m.to as Square);
  }, [selected, version]);

  const lastMove = useMemo(() => {
    const history = game.history();
    const m = history[history.length - 1];
    return m ? { from: m.from as Square, to: m.to as Square } : null;
  }, [version]);

  const checkSquare = useMemo<Square | null>(() => {
    if (!game.inCheck()) return null;
    const turn = game.turn();
    for (const row of game.board()) {
      for (const cell of row) {
        if (cell && cell.type === "k" && cell.color === turn) {
          return cell.square as Square;
        }
      }
    }
    return null;
  }, [version]);

  // Let the engine move whenever it is the AI's turn.
  useEffect(() => {
    if (mode !== "ai" || game.turn() === HUMAN || game.isGameOver()) return;
    setThinking(true);
    const timer = setTimeout(() => {
      const move = findBestMove(gameRef.current, DIFFICULTY_DEPTH[difficulty]);
      if (move) gameRef.current.move(move);
      setThinking(false);
      sync();
    }, 350);
    return () => clearTimeout(timer);
  }, [version, mode, difficulty]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const handleSquarePress = (square: Square) => {
    if (game.isGameOver() || thinking || aiTurn) return;
    const piece = game.get(square);

    if (selected) {
      if (square === selected) {
        setSelected(null);
        return;
      }
      const target = game
        .moves({ square: selected })
        .find((m) => m.to === square);
      if (target) {
        game.move({ from: selected, to: square });
        setSelected(null);
        sync();
        return;
      }
      if (piece && piece.color === game.turn()) {
        setSelected(square);
        return;
      }
      setSelected(null);
      return;
    }

    if (piece && piece.color === game.turn()) {
      setSelected(square);
    }
  };

  const newGame = () => {
    gameRef.current = new Xiangqi();
    setSelected(null);
    setThinking(false);
    setVersion((v) => v + 1);
  };

  const undo = () => {
    if (thinking) return;
    const g = gameRef.current;
    g.undo();
    // In AI mode, also undo the engine's reply so it stays the human's turn.
    if (mode === "ai" && g.turn() !== HUMAN && g.history().length > 0) {
      g.undo();
    }
    setSelected(null);
    sync();
  };

  const toggleMode = () => {
    setMode((m) => (m === "ai" ? "two" : "ai"));
    setSelected(null);
  };

  const status = getStatus(game, thinking);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onBack}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹ Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Cờ Tướng</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusText}>{status}</Text>
          <Text style={styles.subText}>
            {mode === "ai"
              ? `Bạn cầm quân Đỏ · vs AI local (${DIFFICULTY_LABEL[difficulty]})`
              : "2 người chơi trên cùng máy"}
          </Text>
        </View>

        {mode === "ai" && (
          <DifficultyPicker value={difficulty} onChange={setDifficulty} />
        )}

        <XiangqiBoard
          board={game.board()}
          width={BOARD_WIDTH}
          selected={selected}
          legalTargets={legalTargets}
          lastMove={lastMove}
          checkSquare={checkSquare}
          onSquarePress={handleSquarePress}
        />

        <View style={styles.controls}>
          <Button label="Ván mới" onPress={newGame} kind="primary" />
          <Button label="Đi lại" onPress={undo} />
          <Button
            label={mode === "ai" ? "Chế độ: AI local" : "Chế độ: 2 người"}
            onPress={toggleMode}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function getStatus(game: Xiangqi, thinking: boolean): string {
  if (game.isCheckmate()) {
    const winner = game.turn() === "r" ? "Đen" : "Đỏ";
    return `Chiếu tướng — ${winner} thắng!`;
  }
  if (game.isStalemate()) {
    // Xiangqi rule: the side with no legal moves loses.
    const loser = game.turn() === "r" ? "Đỏ" : "Đen";
    return `Hết nước đi — ${loser} thua`;
  }
  if (thinking) return "Máy đang suy nghĩ…";
  const turn = game.turn() === "r" ? "Đỏ" : "Đen";
  const check = game.inCheck() ? " — Chiếu!" : "";
  return `Lượt: ${turn}${check}`;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: "primary" | "default";
};

function DifficultyPicker({
  value,
  onChange,
}: {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
}) {
  const levels: Difficulty[] = ["easy", "medium", "hard"];
  return (
    <View style={styles.diffRow}>
      <Text style={styles.diffLabel}>Độ khó AI</Text>
      <View style={styles.diffSegments}>
        {levels.map((d) => (
          <TouchableOpacity
            key={d}
            activeOpacity={0.7}
            onPress={() => onChange(d)}
            style={[styles.diffSeg, value === d && styles.diffSegActive]}
          >
            <Text
              style={[
                styles.diffSegText,
                value === d && styles.diffSegTextActive,
              ]}
            >
              {DIFFICULTY_LABEL[d]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Button({ label, onPress, kind = "default" }: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.button, kind === "primary" && styles.buttonPrimary]}
    >
      <Text
        style={[
          styles.buttonText,
          kind === "primary" && styles.buttonTextPrimary,
        ]}
      >
        {label}
      </Text>
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
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  header: {
    width: BOARD_WIDTH,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    width: 96,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#7FA650",
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    color: "#F2F2F2",
    textAlign: "center",
  },
  statusCard: {
    width: BOARD_WIDTH,
    backgroundColor: "#3A3733",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  subText: {
    color: "#A8A39B",
    fontSize: 13,
    marginTop: 2,
  },
  diffRow: {
    width: BOARD_WIDTH,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  diffLabel: {
    color: "#A8A39B",
    fontSize: 13,
    fontWeight: "700",
    marginRight: 10,
  },
  diffSegments: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#2F2C29",
    borderRadius: 8,
    padding: 3,
  },
  diffSeg: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: "center",
  },
  diffSegActive: {
    backgroundColor: "#B22222",
  },
  diffSegText: {
    color: "#A8A39B",
    fontSize: 13,
    fontWeight: "700",
  },
  diffSegTextActive: {
    color: "#FFFFFF",
  },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 18,
    gap: 10,
  },
  button: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#4A4641",
  },
  buttonPrimary: {
    backgroundColor: "#B22222",
  },
  buttonText: {
    color: "#EDEDED",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonTextPrimary: {
    color: "#FFFFFF",
  },
});
