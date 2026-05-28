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
  /** 10 rows x 9 cols (rank 0 = top, file 0 = 'a'). */
  board: Cell[][];
  /** Total pixel width; height is derived to keep a 9:10 aspect ratio. */
  width: number;
  selected: Square | null;
  legalTargets: Square[];
  lastMove: LastMove;
  /** Square of the king currently in check, if any. */
  checkSquare: Square | null;
  onSquarePress: (square: Square) => void;
};

const W = 9;
const H = 10;
const FILES = "abcdefghi";

const GLYPH: Record<Color, Record<PieceSymbol, string>> = {
  r: { k: "帥", a: "仕", e: "相", h: "傌", r: "俥", c: "炮", p: "兵" },
  b: { k: "將", a: "士", e: "象", h: "馬", r: "車", c: "砲", p: "卒" },
};

const BOARD_BG = "#E8C887";
const LINE = "#3D2A12";
const RED_INK = "#B22222";
const BLACK_INK = "#1A1A1A";
const PIECE_FACE = "#F4E0B0";
const MOVE_DURATION = 220;

const sqName = (f: number, r: number): Square => FILES[f] + r;
const parseSq = (s: Square): [number, number] => [
  s.charCodeAt(0) - 97,
  Number(s.slice(1)),
];

export default function XiangqiBoard({
  board,
  width,
  selected,
  legalTargets,
  lastMove,
  checkSquare,
  onSquarePress,
}: Props) {
  // Layout: every intersection sits in the centre of a `cell`-sized square, so
  // 9 files give 9 columns and 10 ranks give 10 rows. Board total = 9c x 10c.
  const cell = width / W;
  const pad = cell / 2;
  const boardHeight = cell * H;
  const pieceRadius = cell * 0.42;

  const intersectX = (f: number): number => pad + f * cell;
  const intersectY = (r: number): number => pad + r * cell;

  // ---- slide animation for the most-recently moved piece ------------------
  const slide = useRef(new Animated.Value(1)).current;
  const prevMove = useRef<LastMove>(null);

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
    <View
      style={[styles.board, { width, height: boardHeight, backgroundColor: BOARD_BG }]}
    >
      {renderGridLines(cell, pad)}
      {renderPalaceCrosses(cell, pad)}
      {renderRiverLabel(cell, pad, width)}
      {renderIndicators({
        cell,
        pieceRadius,
        intersectX,
        intersectY,
        board,
        legalTargets,
        lastMove,
        checkSquare,
      })}
      {renderTouchPoints(cell, onSquarePress)}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {renderPieces({
          board,
          cell,
          pieceRadius,
          intersectX,
          intersectY,
          lastMove,
          selected,
          slide,
        })}
      </View>
    </View>
  );
}

// ---- subcomponents ---------------------------------------------------------

function renderGridLines(cell: number, pad: number): React.ReactNode {
  const lines: React.ReactNode[] = [];
  const innerWidth = (W - 1) * cell;
  const innerHeight = (H - 1) * cell;

  // 10 horizontal lines, full width.
  for (let r = 0; r < H; r++) {
    lines.push(
      <View
        key={`h${r}`}
        style={[
          styles.line,
          { left: pad, top: pad + r * cell - 0.5, width: innerWidth, height: 1 },
        ]}
      />
    );
  }

  // 9 vertical lines. The inner 7 are broken in the middle by the river.
  for (let f = 0; f < W; f++) {
    if (f === 0 || f === W - 1) {
      lines.push(
        <View
          key={`v${f}`}
          style={[
            styles.line,
            { left: pad + f * cell - 0.5, top: pad, width: 1, height: innerHeight },
          ]}
        />
      );
    } else {
      lines.push(
        <View
          key={`v${f}t`}
          style={[
            styles.line,
            { left: pad + f * cell - 0.5, top: pad, width: 1, height: 4 * cell },
          ]}
        />
      );
      lines.push(
        <View
          key={`v${f}b`}
          style={[
            styles.line,
            {
              left: pad + f * cell - 0.5,
              top: pad + 5 * cell,
              width: 1,
              height: 4 * cell,
            },
          ]}
        />
      );
    }
  }
  return lines;
}

/** The "X" lines across each palace. */
function renderPalaceCrosses(cell: number, pad: number): React.ReactNode {
  const diagLen = 2 * cell * Math.SQRT2;
  const out: React.ReactNode[] = [];
  // Each palace's centre is at file 4 (e) and ranks 1 (black) or 8 (red).
  for (const midRank of [1, 8]) {
    const cx = pad + 4 * cell;
    const cy = pad + midRank * cell;
    for (const rotate of ["45deg", "-45deg"]) {
      out.push(
        <View
          key={`pal${midRank}${rotate}`}
          style={[
            styles.line,
            {
              left: cx - diagLen / 2,
              top: cy - 0.5,
              width: diagLen,
              height: 1,
              transform: [{ rotate }],
            },
          ]}
        />
      );
    }
  }
  return out;
}

function renderRiverLabel(cell: number, pad: number, width: number): React.ReactNode {
  return (
    <Text
      style={[
        styles.river,
        {
          top: pad + 4 * cell,
          height: cell,
          width: width - cell,
          left: pad,
          fontSize: cell * 0.55,
        },
      ]}
    >
      楚 河                 漢 界
    </Text>
  );
}

function renderTouchPoints(
  cell: number,
  onSquarePress: (s: Square) => void
): React.ReactNode {
  const out: React.ReactNode[] = [];
  for (let r = 0; r < H; r++) {
    for (let f = 0; f < W; f++) {
      const square = sqName(f, r);
      out.push(
        <TouchableOpacity
          key={square}
          activeOpacity={0.6}
          onPress={() => onSquarePress(square)}
          style={{
            position: "absolute",
            left: f * cell,
            top: r * cell,
            width: cell,
            height: cell,
          }}
        />
      );
    }
  }
  return out;
}

type IndicatorArgs = {
  cell: number;
  pieceRadius: number;
  intersectX: (f: number) => number;
  intersectY: (r: number) => number;
  board: Cell[][];
  legalTargets: Square[];
  lastMove: LastMove;
  checkSquare: Square | null;
};

function renderIndicators(args: IndicatorArgs): React.ReactNode {
  const out: React.ReactNode[] = [];
  const { cell, pieceRadius, intersectX, intersectY } = args;

  // Last-move source and destination — a yellow outline.
  if (args.lastMove) {
    for (const [key, sq] of [
      ["from", args.lastMove.from],
      ["to", args.lastMove.to],
    ] as const) {
      const [f, r] = parseSq(sq);
      out.push(
        <View
          key={`last-${key}`}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: intersectX(f) - pieceRadius,
            top: intersectY(r) - pieceRadius,
            width: pieceRadius * 2,
            height: pieceRadius * 2,
            borderRadius: pieceRadius,
            borderWidth: 2,
            borderColor: "rgba(255, 215, 64, 0.85)",
          }}
        />
      );
    }
  }

  // Legal-move hints — small dot for empty squares, ring for captures.
  for (const sq of args.legalTargets) {
    const [f, r] = parseSq(sq);
    const piece = args.board[r][f];
    if (piece) {
      const ring = pieceRadius + 3;
      out.push(
        <View
          key={`tgt-${sq}`}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: intersectX(f) - ring,
            top: intersectY(r) - ring,
            width: ring * 2,
            height: ring * 2,
            borderRadius: ring,
            borderWidth: 3,
            borderColor: "rgba(0,0,0,0.45)",
          }}
        />
      );
    } else {
      const d = cell * 0.3;
      out.push(
        <View
          key={`tgt-${sq}`}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: intersectX(f) - d / 2,
            top: intersectY(r) - d / 2,
            width: d,
            height: d,
            borderRadius: d / 2,
            backgroundColor: "rgba(0,0,0,0.35)",
          }}
        />
      );
    }
  }

  // King-in-check — red ring around the king.
  if (args.checkSquare) {
    const [f, r] = parseSq(args.checkSquare);
    const ring = pieceRadius + 4;
    out.push(
      <View
        key="check"
        pointerEvents="none"
        style={{
          position: "absolute",
          left: intersectX(f) - ring,
          top: intersectY(r) - ring,
          width: ring * 2,
          height: ring * 2,
          borderRadius: ring,
          borderWidth: 3,
          borderColor: "#E53935",
        }}
      />
    );
  }
  return out;
}

type PieceArgs = {
  board: Cell[][];
  cell: number;
  pieceRadius: number;
  intersectX: (f: number) => number;
  intersectY: (r: number) => number;
  lastMove: LastMove;
  selected: Square | null;
  slide: Animated.Value;
};

function renderPieces(args: PieceArgs): React.ReactNode {
  const { board, cell, pieceRadius, intersectX, intersectY, lastMove, selected, slide } = args;
  const out: React.ReactNode[] = [];

  for (let r = 0; r < H; r++) {
    for (let f = 0; f < W; f++) {
      const cellPiece = board[r][f];
      if (!cellPiece) continue;

      const square = sqName(f, r);
      const isMover = !!lastMove && lastMove.to === square;
      const isSelected = selected === square;
      const restX = intersectX(f) - pieceRadius;
      const restY = intersectY(r) - pieceRadius;

      let translateX: number | Animated.AnimatedInterpolation<number> = restX;
      let translateY: number | Animated.AnimatedInterpolation<number> = restY;
      if (isMover && lastMove) {
        const [ff, fr] = parseSq(lastMove.from);
        translateX = slide.interpolate({
          inputRange: [0, 1],
          outputRange: [intersectX(ff) - pieceRadius, restX],
        });
        translateY = slide.interpolate({
          inputRange: [0, 1],
          outputRange: [intersectY(fr) - pieceRadius, restY],
        });
      }

      const ink = cellPiece.color === "r" ? RED_INK : BLACK_INK;

      out.push(
        <Animated.View
          key={square}
          style={[
            styles.piece,
            {
              width: pieceRadius * 2,
              height: pieceRadius * 2,
              borderRadius: pieceRadius,
              borderColor: isSelected ? "#F9A825" : ink,
              borderWidth: isSelected ? 3 : 2,
              zIndex: isMover ? 2 : 1,
              transform: [{ translateX }, { translateY }],
            },
          ]}
        >
          <Text
            style={[
              styles.pieceText,
              { color: ink, fontSize: cell * 0.46 },
            ]}
          >
            {GLYPH[cellPiece.color][cellPiece.type]}
          </Text>
        </Animated.View>
      );
    }
  }
  return out;
}

const styles = StyleSheet.create({
  board: {
    borderRadius: 6,
    overflow: "hidden",
  },
  line: {
    position: "absolute",
    backgroundColor: LINE,
  },
  river: {
    position: "absolute",
    textAlign: "center",
    textAlignVertical: "center",
    color: "#5C3A18",
    fontWeight: "600",
    letterSpacing: 1,
  },
  piece: {
    position: "absolute",
    left: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PIECE_FACE,
  },
  pieceText: {
    fontWeight: "900",
    includeFontPadding: false,
  },
});
