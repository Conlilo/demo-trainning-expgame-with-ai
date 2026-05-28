import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Board,
  CellState,
  Puzzle,
  blockedCells,
  colOf,
  cycleCell,
  findConflicts,
  isSolved,
  newBoard,
  queensPlaced,
  rowOf,
} from "./engine";
import {
  DIFFICULTY_CONFIG,
  DIFFICULTY_ORDER,
  Difficulty,
  REGION_COLORS,
  randomPuzzle,
} from "./puzzles";

type Props = { onBack: () => void };

const SCREEN_WIDTH = Dimensions.get("window").width;
const MAX_BOARD = Math.min(SCREEN_WIDTH - 24, 420);

export default function QueensScreen({ onBack }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [puzzle, setPuzzle] = useState<Puzzle>(() => randomPuzzle("beginner"));
  const [board, setBoard] = useState<Board>(() => newBoard(puzzle.size));
  const [pickerOpen, setPickerOpen] = useState(false);

  const conflicts = useMemo(
    () => findConflicts(board, puzzle),
    [board, puzzle]
  );
  const blocked = useMemo(
    () => blockedCells(board, puzzle),
    [board, puzzle]
  );
  const solved = useMemo(() => isSolved(board, puzzle), [board, puzzle]);
  const placed = queensPlaced(board);

  const onTapCell = (idx: number): void => {
    setBoard((prev) => {
      const next = prev.slice();
      next[idx] = cycleCell(prev[idx]);
      return next;
    });
  };

  const newPuzzle = (d: Difficulty): void => {
    const p = randomPuzzle(d);
    setDifficulty(d);
    setPuzzle(p);
    setBoard(newBoard(p.size));
  };

  const resetCurrent = (): void => setBoard(newBoard(puzzle.size));

  const cellSize = MAX_BOARD / puzzle.size;
  const boardSize = cellSize * puzzle.size;

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
          <Text style={styles.title}>Queens</Text>
          <View style={styles.side} />
        </View>

        <TouchableOpacity
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.85}
          style={styles.dropdown}
        >
          <View>
            <Text style={styles.dropdownLabel}>Độ khó</Text>
            <Text style={styles.dropdownValue}>
              {DIFFICULTY_CONFIG[difficulty].size}×
              {DIFFICULTY_CONFIG[difficulty].size} ·{" "}
              {DIFFICULTY_CONFIG[difficulty].label}
            </Text>
          </View>
          <Text style={styles.dropdownChevron}>▾</Text>
        </TouchableOpacity>

        <Modal
          visible={pickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerOpen(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setPickerOpen(false)}
          >
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <Text style={styles.modalTitle}>Chọn độ khó</Text>
              {DIFFICULTY_ORDER.map((d) => {
                const cfg = DIFFICULTY_CONFIG[d];
                const active = d === difficulty;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => {
                      setPickerOpen(false);
                      newPuzzle(d);
                    }}
                    activeOpacity={0.85}
                    style={[
                      styles.modalRow,
                      active && styles.modalRowActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalSize,
                        active && styles.modalSizeActive,
                      ]}
                    >
                      {cfg.size}×{cfg.size}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.modalLabel,
                          active && styles.modalLabelActive,
                        ]}
                      >
                        {cfg.label}
                      </Text>
                      <Text style={styles.modalSub}>{cfg.sublabel}</Text>
                    </View>
                    {active && <Text style={styles.modalCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </Pressable>
          </Pressable>
        </Modal>

        <Text style={styles.hint}>
          Chạm 1 ô để đánh × (lưu ý). Chạm tiếp để đặt ♛. Chạm thêm để xoá.
        </Text>

        <BoardView
          puzzle={puzzle}
          board={board}
          conflicts={conflicts}
          blocked={blocked}
          cellSize={cellSize}
          boardSize={boardSize}
          onTapCell={onTapCell}
        />

        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            Đã đặt: <Text style={styles.statusBold}>{placed}</Text> / {puzzle.size}
          </Text>
          {conflicts.size > 0 && (
            <Text style={styles.statusBad}>· {conflicts.size} ô vi phạm</Text>
          )}
        </View>

        {solved && (
          <View style={styles.winBanner}>
            <Text style={styles.winLabel}>HOÀN THÀNH</Text>
            <Text style={styles.winText}>Bạn đã đặt đủ hậu hợp lệ!</Text>
          </View>
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
        </View>
      </View>
    </SafeAreaView>
  );
}

function BoardView({
  puzzle,
  board,
  conflicts,
  blocked,
  cellSize,
  boardSize,
  onTapCell,
}: {
  puzzle: Puzzle;
  board: Board;
  conflicts: Set<number>;
  blocked: Set<number>;
  cellSize: number;
  boardSize: number;
  onTapCell: (idx: number) => void;
}) {
  return (
    <View style={[styles.boardWrap, { width: boardSize, height: boardSize }]}>
      {board.map((state, i) => {
        const r = rowOf(i, puzzle.size);
        const c = colOf(i, puzzle.size);
        const region = puzzle.regions[i];
        return (
          <CellView
            key={i}
            row={r}
            col={c}
            size={cellSize}
            state={state}
            color={REGION_COLORS[region % REGION_COLORS.length]}
            inConflict={conflicts.has(i)}
            autoBlocked={blocked.has(i)}
            isLastRow={r === puzzle.size - 1}
            isLastCol={c === puzzle.size - 1}
            onPress={() => onTapCell(i)}
          />
        );
      })}
    </View>
  );
}

function CellView({
  row,
  col,
  size,
  state,
  color,
  inConflict,
  autoBlocked,
  isLastRow,
  isLastCol,
  onPress,
}: {
  row: number;
  col: number;
  size: number;
  state: CellState;
  color: string;
  inConflict: boolean;
  autoBlocked: boolean;
  isLastRow: boolean;
  isLastCol: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        position: "absolute",
        left: col * size,
        top: row * size,
        width: size,
        height: size,
        backgroundColor: color,
        borderRightWidth: isLastCol ? 0 : 1,
        borderBottomWidth: isLastRow ? 0 : 1,
        borderColor: "#3A3733",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {state === "queen" && (
        <Text
          style={{
            fontSize: Math.floor(size * 0.7),
            color: inConflict ? "#C62828" : "#1B1A18",
          }}
        >
          ♛
        </Text>
      )}
      {state === "marked" && (
        <Text
          style={{
            fontSize: Math.floor(size * 0.5),
            color: "#5C5650",
            fontWeight: "700",
          }}
        >
          ×
        </Text>
      )}
      {state === "empty" && autoBlocked && (
        <Text
          style={{
            fontSize: Math.floor(size * 0.35),
            color: "#5C5650",
            fontWeight: "600",
            opacity: 0.45,
          }}
        >
          ×
        </Text>
      )}
    </TouchableOpacity>
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

  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1F1D1B",
    borderWidth: 1,
    borderColor: "#3A3733",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  dropdownLabel: {
    color: "#A8A39B",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dropdownValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  dropdownChevron: {
    color: "#D4954A",
    fontSize: 18,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalSheet: {
    backgroundColor: "#2A2724",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  modalTitle: {
    color: "#F2F2F2",
    fontSize: 14,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingBottom: 8,
    letterSpacing: 0.5,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  modalRowActive: {
    backgroundColor: "#3A3733",
  },
  modalSize: {
    color: "#D8D2C8",
    fontSize: 18,
    fontWeight: "800",
    minWidth: 56,
  },
  modalSizeActive: { color: "#FFFFFF" },
  modalLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalLabelActive: { color: "#FFFFFF" },
  modalSub: {
    color: "#A8A39B",
    fontSize: 12,
    marginTop: 2,
  },
  modalCheck: {
    color: "#D4954A",
    fontSize: 20,
    fontWeight: "800",
  },

  hint: {
    color: "#A8A39B",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
  },

  boardWrap: {
    alignSelf: "center",
    borderRadius: 4,
    position: "relative",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#1B1A18",
  },

  statusRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 14,
    gap: 8,
  },
  statusText: { color: "#D8D2C8", fontSize: 14 },
  statusBold: { color: "#FFFFFF", fontWeight: "800" },
  statusBad: { color: "#E57373", fontSize: 14, fontWeight: "700" },

  winBanner: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 16,
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
  winText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800", marginTop: 4 },

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
