import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import type { Color, PieceSymbol, Square } from "./engine";

export type Cell = { type: PieceSymbol; color: Color } | null;

type LastMove = { from: Square; to: Square } | null;

type Props = {
  /** 8x8 grid from chess.js game.board() — row 0 is rank 8. */
  board: Cell[][];
  /** Pixel size of the whole board (width = height). */
  size: number;
  selected: Square | null;
  legalTargets: Square[];
  lastMove: LastMove;
  /** Square of the king currently in check, if any. */
  checkSquare: Square | null;
  onSquarePress: (square: Square) => void;
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

// One filled glyph per piece type; color is applied via text color so the
// pieces render reliably on Android (outline glyphs are unreliable there).
const GLYPH: Record<PieceSymbol, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

const LIGHT = "#EBECD0";
const DARK = "#739552";
const MOVE_DURATION = 200;

// Column / row indices of a square (a8 is column 0, row 0).
function squareCoords(square: Square): { col: number; row: number } {
  return {
    col: square.charCodeAt(0) - 97,
    row: 8 - parseInt(square[1], 10),
  };
}

export default function ChessBoard({
  board,
  size,
  selected,
  legalTargets,
  lastMove,
  checkSquare,
  onSquarePress,
}: Props) {
  const cellSize = size / 8;

  // Drives the slide of the most-recently-moved piece from 0 (origin) to 1.
  const slide = useRef(new Animated.Value(1)).current;
  const prevMove = useRef<LastMove>(null);

  // Detect a new move during render so the moving piece is painted at its
  // origin square on the first frame — this avoids a one-frame flicker at
  // the destination before the animation starts.
  if (lastMove !== prevMove.current) {
    prevMove.current = lastMove;
    if (lastMove) slide.setValue(0);
  }

  useEffect(() => {
    if (!lastMove) return;
    Animated.timing(slide, {
      toValue: 1,
      duration: MOVE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [lastMove]);

  return (
    <View style={[styles.board, { width: size, height: size }]}>
      {/* Layer 1 — touchable squares, highlights and move hints. */}
      {board.map((row, r) =>
        row.map((cell, c) => {
          const square = `${FILES[c]}${8 - r}` as Square;
          const isDark = (r + c) % 2 === 1;
          const isSelected = selected === square;
          const isTarget = legalTargets.includes(square);
          const isLast =
            !!lastMove && (lastMove.from === square || lastMove.to === square);
          const isCheck = checkSquare === square;

          let background = isDark ? DARK : LIGHT;
          if (isLast) background = isDark ? "#B9A93B" : "#F5EE83";
          if (isSelected) background = isDark ? "#C7CA52" : "#F7F88B";
          if (isCheck) background = "#E06A6A";

          return (
            <TouchableOpacity
              key={square}
              activeOpacity={0.7}
              onPress={() => onSquarePress(square)}
              style={[
                styles.square,
                { width: cellSize, height: cellSize, backgroundColor: background },
              ]}
            >
              {isTarget &&
                (cell ? (
                  <View
                    style={[styles.captureRing, { borderWidth: cellSize * 0.09 }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.moveDot,
                      {
                        width: cellSize * 0.3,
                        height: cellSize * 0.3,
                        borderRadius: cellSize * 0.15,
                      },
                    ]}
                  />
                ))}
            </TouchableOpacity>
          );
        })
      )}

      {/* Layer 2 — pieces. Visual only; taps fall through to the squares. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {board.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return null;
            const square = `${FILES[c]}${8 - r}` as Square;
            const isMover = !!lastMove && lastMove.to === square;

            // Static pieces sit at their square; the moving piece interpolates
            // from its origin square to here.
            let translateX: number | Animated.AnimatedInterpolation<number> =
              c * cellSize;
            let translateY: number | Animated.AnimatedInterpolation<number> =
              r * cellSize;

            if (isMover && lastMove) {
              const from = squareCoords(lastMove.from);
              translateX = slide.interpolate({
                inputRange: [0, 1],
                outputRange: [from.col * cellSize, c * cellSize],
              });
              translateY = slide.interpolate({
                inputRange: [0, 1],
                outputRange: [from.row * cellSize, r * cellSize],
              });
            }

            return (
              <Animated.View
                key={square}
                style={[
                  styles.pieceCell,
                  {
                    width: cellSize,
                    height: cellSize,
                    zIndex: isMover ? 2 : 1,
                    transform: [{ translateX }, { translateY }],
                  },
                ]}
              >
                <Text
                  style={[
                    styles.piece,
                    { fontSize: cellSize * 0.78 },
                    cell.color === "w" ? styles.whitePiece : styles.blackPiece,
                  ]}
                >
                  {GLYPH[cell.type]}
                </Text>
              </Animated.View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 6,
    overflow: "hidden",
  },
  square: {
    alignItems: "center",
    justifyContent: "center",
  },
  pieceCell: {
    position: "absolute",
    left: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  piece: {
    fontWeight: "900",
    textAlign: "center",
    includeFontPadding: false,
  },
  whitePiece: {
    color: "#FCFCFC",
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  blackPiece: {
    color: "#1F1F1F",
    textShadowColor: "rgba(255,255,255,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  moveDot: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  captureRing: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderColor: "rgba(0,0,0,0.28)",
  },
});
