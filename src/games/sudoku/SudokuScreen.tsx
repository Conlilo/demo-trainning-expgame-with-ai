import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Board,
  Cell,
  SIZE,
  colOf,
  digitsRemaining,
  findConflicts,
  fromString,
  isSolved,
  rowOf,
} from "./engine";
import { Difficulty, randomPuzzle } from "./puzzles";

type Props = { onBack: () => void };

const SCREEN_WIDTH = Dimensions.get("window").width;
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 24, 420);
const CELL_SIZE = BOARD_SIZE / SIZE;

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Dễ",
  medium: "Vừa",
  hard: "Khó",
};

export default function SudokuScreen({ onBack }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [board, setBoard] = useState<Board>(() => fromString(randomPuzzle("easy")));
  const [selected, setSelected] = useState<number | null>(null);
  const [showConflicts, setShowConflicts] = useState(true);

  const conflicts = useMemo(
    () => (showConflicts ? findConflicts(board) : new Set<number>()),
    [board, showConflicts]
  );
  const remaining = useMemo(() => digitsRemaining(board), [board]);
  const solved = useMemo(() => isSolved(board), [board]);

  const selectedValue = selected != null ? board[selected].value : 0;

  const setCell = (idx: number, value: number): void => {
    if (board[idx].given) return;
    setBoard((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], value };
      return next;
    });
  };

  const onTapCell = (idx: number): void => {
    setSelected((cur) => (cur === idx ? null : idx));
  };

  const onTapDigit = (d: number): void => {
    if (selected == null) return;
    if (board[selected].given) return;
    if (board[selected].value === d) {
      setCell(selected, 0); // toggle off
    } else {
      setCell(selected, d);
    }
  };

  const onClear = (): void => {
    if (selected == null) return;
    setCell(selected, 0);
  };

  const newPuzzle = (d: Difficulty): void => {
    setDifficulty(d);
    setBoard(fromString(randomPuzzle(d)));
    setSelected(null);
  };

  const resetCurrent = (): void => {
    setBoard((prev) =>
      prev.map((c) => (c.given ? c : { ...c, value: 0 }))
    );
    setSelected(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.side} activeOpacity={0.7}>
            <Text style={styles.backText}>‹ Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Sudoku</Text>
          <View style={styles.side} />
        </View>

        <View style={styles.difficultyRow}>
          {DIFFICULTIES.map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => newPuzzle(d)}
              activeOpacity={0.85}
              style={[
                styles.diffBtn,
                d === difficulty && styles.diffBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.diffBtnText,
                  d === difficulty && styles.diffBtnTextActive,
                ]}
              >
                {DIFFICULTY_LABEL[d]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <BoardView
          board={board}
          selected={selected}
          selectedValue={selectedValue}
          conflicts={conflicts}
          onTapCell={onTapCell}
        />

        {solved ? (
          <View style={styles.winBanner}>
            <Text style={styles.winLabel}>HOÀN THÀNH</Text>
            <Text style={styles.winText}>Bạn đã giải xong câu đố!</Text>
          </View>
        ) : (
          <NumberPad
            remaining={remaining}
            onTap={onTapDigit}
            onClear={onClear}
            disabled={selected == null || (selected != null && board[selected].given)}
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={resetCurrent}
            activeOpacity={0.8}
            style={[styles.footerBtn, styles.footerBtnSecondary]}
          >
            <Text style={styles.footerBtnText}>↺ Đặt lại</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => newPuzzle(difficulty)}
            activeOpacity={0.85}
            style={[styles.footerBtn, styles.footerBtnPrimary]}
          >
            <Text style={styles.footerBtnText}>Câu đố mới ▸</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowConflicts((v) => !v)}
            activeOpacity={0.8}
            style={[
              styles.footerBtn,
              styles.footerBtnSecondary,
              { flex: 0.9 },
            ]}
          >
            <Text style={styles.footerBtnText}>
              {showConflicts ? "Ẩn lỗi" : "Soi lỗi"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function BoardView({
  board,
  selected,
  selectedValue,
  conflicts,
  onTapCell,
}: {
  board: Board;
  selected: number | null;
  selectedValue: number;
  conflicts: Set<number>;
  onTapCell: (idx: number) => void;
}) {
  const selR = selected != null ? rowOf(selected) : -1;
  const selC = selected != null ? colOf(selected) : -1;
  return (
    <View style={[styles.boardWrap, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
      {board.map((cell, i) => (
        <CellView
          key={i}
          idx={i}
          cell={cell}
          isSelected={i === selected}
          isHighlightedPeer={rowOf(i) === selR || colOf(i) === selC}
          isHighlightedSameDigit={
            selectedValue !== 0 && cell.value === selectedValue
          }
          isConflict={conflicts.has(i)}
          onTap={onTapCell}
        />
      ))}
      <Grid />
    </View>
  );
}

function CellView({
  idx,
  cell,
  isSelected,
  isHighlightedPeer,
  isHighlightedSameDigit,
  isConflict,
  onTap,
}: {
  idx: number;
  cell: Cell;
  isSelected: boolean;
  isHighlightedPeer: boolean;
  isHighlightedSameDigit: boolean;
  isConflict: boolean;
  onTap: (idx: number) => void;
}) {
  const r = rowOf(idx);
  const c = colOf(idx);
  return (
    <TouchableOpacity
      onPress={() => onTap(idx)}
      activeOpacity={0.7}
      style={[
        styles.cell,
        {
          left: c * CELL_SIZE,
          top: r * CELL_SIZE,
          width: CELL_SIZE,
          height: CELL_SIZE,
        },
        isHighlightedPeer && styles.cellPeer,
        isHighlightedSameDigit && styles.cellSameDigit,
        isSelected && styles.cellSelected,
      ]}
    >
      {cell.value !== 0 && (
        <Text
          style={[
            styles.cellText,
            cell.given ? styles.cellGiven : styles.cellGuess,
            isConflict && styles.cellConflict,
          ]}
        >
          {cell.value}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/** Thin gridlines drawn on top — heavy strokes every 3 cells delimit boxes. */
function Grid() {
  const lines: React.ReactNode[] = [];
  for (let i = 0; i <= SIZE; i++) {
    const thick = i % 3 === 0;
    const color = thick ? "#1B1A18" : "#5C5650";
    const thickness = thick ? 2 : 1;
    // vertical
    lines.push(
      <View
        key={`v${i}`}
        pointerEvents="none"
        style={{
          position: "absolute",
          left: i * CELL_SIZE - thickness / 2,
          top: 0,
          width: thickness,
          height: BOARD_SIZE,
          backgroundColor: color,
        }}
      />
    );
    // horizontal
    lines.push(
      <View
        key={`h${i}`}
        pointerEvents="none"
        style={{
          position: "absolute",
          top: i * CELL_SIZE - thickness / 2,
          left: 0,
          height: thickness,
          width: BOARD_SIZE,
          backgroundColor: color,
        }}
      />
    );
  }
  return <>{lines}</>;
}

function NumberPad({
  remaining,
  onTap,
  onClear,
  disabled,
}: {
  remaining: Record<number, number>;
  onTap: (d: number) => void;
  onClear: () => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.padWrap}>
      <View style={styles.padRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
          const used = remaining[d] === 0;
          return (
            <TouchableOpacity
              key={d}
              onPress={() => onTap(d)}
              disabled={disabled || used}
              activeOpacity={0.8}
              style={[
                styles.padBtn,
                used && styles.padBtnUsed,
                disabled && styles.padBtnDisabled,
              ]}
            >
              <Text
                style={[
                  styles.padBtnText,
                  used && styles.padBtnTextUsed,
                ]}
              >
                {d}
              </Text>
              {!used && (
                <Text style={styles.padBtnSub}>{remaining[d]}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        onPress={onClear}
        disabled={disabled}
        activeOpacity={0.8}
        style={[styles.padClear, disabled && styles.padBtnDisabled]}
      >
        <Text style={styles.padClearText}>✕  Xoá ô đã chọn</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#262421" },
  container: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
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

  difficultyRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  diffBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#3A3733",
    borderWidth: 1,
    borderColor: "#4A4641",
  },
  diffBtnActive: {
    backgroundColor: "#D4954A",
    borderColor: "#D4954A",
  },
  diffBtnText: { color: "#D8D2C8", fontSize: 13, fontWeight: "700" },
  diffBtnTextActive: { color: "#FFFFFF" },

  boardWrap: {
    alignSelf: "center",
    backgroundColor: "#EFE7DA",
    borderRadius: 4,
    position: "relative",
    overflow: "hidden",
  },
  cell: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  cellPeer: { backgroundColor: "#E0D5BD" },
  cellSameDigit: { backgroundColor: "#CFC09E" },
  cellSelected: { backgroundColor: "#E8B665" },
  cellText: { fontSize: Math.floor(CELL_SIZE * 0.55), fontWeight: "700" },
  cellGiven: { color: "#1B1A18" },
  cellGuess: { color: "#1565C0" },
  cellConflict: { color: "#C62828" },

  padWrap: { marginTop: 14 },
  padRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  padBtn: {
    flex: 1,
    height: 52,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: "#3A3733",
    alignItems: "center",
    justifyContent: "center",
  },
  padBtnUsed: { backgroundColor: "#2A2724", opacity: 0.5 },
  padBtnDisabled: { opacity: 0.4 },
  padBtnText: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  padBtnTextUsed: { color: "#7A736A" },
  padBtnSub: {
    color: "#A8A39B",
    fontSize: 10,
    fontWeight: "700",
    marginTop: -2,
  },
  padClear: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#4A4641",
    alignItems: "center",
  },
  padClearText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  winBanner: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    backgroundColor: "#37412B",
  },
  winLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    opacity: 0.7,
  },
  winText: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginTop: 4 },

  footer: {
    flexDirection: "row",
    marginTop: 14,
    gap: 8,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  footerBtnPrimary: { backgroundColor: "#D4954A" },
  footerBtnSecondary: { backgroundColor: "#3A3733" },
  footerBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
