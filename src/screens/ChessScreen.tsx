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
import { Chess } from "../chess/engine";
import type { Square } from "../chess/engine";
import ChessBoard from "../components/ChessBoard";
import { findBestMove } from "../chess/ai";

const { width } = Dimensions.get("window");
const BOARD_SIZE = Math.floor(Math.min(width - 24, 440));

type Mode = "ai" | "two";

// The human always plays White.
const HUMAN: "w" = "w";

type Props = {
  onBack: () => void;
};

export default function ChessScreen({ onBack }: Props) {
  const gameRef = useRef(new Chess());
  const game = gameRef.current;

  // `fen` is the single source of render truth: every move updates it,
  // which re-renders the screen and re-runs the AI effect.
  const [fen, setFen] = useState(game.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [mode, setMode] = useState<Mode>("ai");
  const [thinking, setThinking] = useState(false);

  const sync = () => setFen(gameRef.current.fen());

  const aiTurn = mode === "ai" && game.turn() !== HUMAN;

  // Legal destination squares for the currently selected piece.
  const legalTargets = useMemo<Square[]>(() => {
    if (!selected) return [];
    return game
      .moves({ square: selected, verbose: true })
      .map((m) => m.to as Square);
  }, [selected, fen]);

  const lastMove = useMemo(() => {
    const history = game.history({ verbose: true });
    const m = history[history.length - 1];
    return m ? { from: m.from as Square, to: m.to as Square } : null;
  }, [fen]);

  // Locate the king of the side to move when it is in check.
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
  }, [fen]);

  // Let the engine move whenever it is the AI's turn.
  useEffect(() => {
    if (mode !== "ai" || game.turn() === HUMAN || game.isGameOver()) return;

    setThinking(true);
    const timer = setTimeout(() => {
      const move = findBestMove(gameRef.current.fen(), 3);
      if (move) gameRef.current.move(move);
      setThinking(false);
      sync();
    }, 350);

    return () => clearTimeout(timer);
  }, [fen, mode]);

  // Android hardware back button returns to the home screen.
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
        .moves({ square: selected, verbose: true })
        .find((m) => m.to === square);

      if (target) {
        game.move({
          from: selected,
          to: square,
          // Auto-promote to queen.
          promotion: target.promotion ? "q" : undefined,
        });
        setSelected(null);
        sync();
        return;
      }
      // Tapped another of our own pieces — switch the selection.
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
    gameRef.current = new Chess();
    setSelected(null);
    setThinking(false);
    setFen(gameRef.current.fen());
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

  const status = getStatus(game, mode, thinking);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onBack}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹ Trang chủ</Text>
          </TouchableOpacity>
          <Text style={styles.title}>♟ Cờ Vua</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusText}>{status}</Text>
          <Text style={styles.subText}>
            {mode === "ai"
              ? "Bạn cầm quân Trắng · đấu với máy"
              : "2 người chơi trên cùng máy"}
          </Text>
        </View>

        <ChessBoard
          board={game.board()}
          size={BOARD_SIZE}
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
            label={mode === "ai" ? "Chế độ: Máy" : "Chế độ: 2 người"}
            onPress={toggleMode}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function getStatus(game: Chess, mode: Mode, thinking: boolean): string {
  if (game.isCheckmate()) {
    const winner = game.turn() === "w" ? "Đen" : "Trắng";
    return `Chiếu hết — ${winner} thắng!`;
  }
  if (game.isStalemate()) return "Hết nước đi — Hòa (stalemate)";
  if (game.isInsufficientMaterial()) return "Hòa — không đủ quân chiếu hết";
  if (game.isThreefoldRepetition()) return "Hòa — lặp nước 3 lần";
  if (game.isDraw()) return "Hòa";

  if (thinking) return "Máy đang suy nghĩ…";

  const turn = game.turn() === "w" ? "Trắng" : "Đen";
  const check = game.inCheck() ? " — Chiếu!" : "";
  return `Lượt: ${turn}${check}`;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: "primary" | "default";
};

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
    width: BOARD_SIZE,
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
    width: BOARD_SIZE,
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
    backgroundColor: "#7FA650",
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
