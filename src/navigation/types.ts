import type { NativeStackScreenProps } from "@react-navigation/native-stack";

/**
 * Route table for the root native-stack navigator.
 *
 * Screens that take a `gameId` receive it as a route param; everything else
 * is param-less. The wrapper components in `App.tsx` adapt these params (and
 * `navigation`) onto each screen's existing prop API.
 */
export type RootStackParamList = {
  Home: undefined;
  Boardgame: undefined;
  Tool: undefined;
  Logic: undefined;
  Chess: undefined;
  Xiangqi: undefined;
  Splendor: undefined;
  Sudoku: undefined;
  Queens: undefined;
  ToolGame: { gameId: string };
  PlaySession: { gameId: string };
};

export type RootStackProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

/** Props for the standalone Chess screen (kept for backwards compatibility). */
export type ChessScreenProps = {
  onBack: () => void;
};
