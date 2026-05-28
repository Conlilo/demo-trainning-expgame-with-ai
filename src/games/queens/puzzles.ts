import { generatePuzzle, Puzzle } from "./engine";

export type Difficulty =
  | "beginner"
  | "classic"
  | "advanced"
  | "expert"
  | "ultimate"
  | "master";

export const DIFFICULTY_ORDER: Difficulty[] = [
  "beginner",
  "classic",
  "advanced",
  "expert",
  "ultimate",
  "master",
];

export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { size: number; label: string; dots: number; sublabel: string }
> = {
  beginner: { size: 7, label: "Beginner", dots: 1, sublabel: "Học cơ bản" },
  classic: { size: 8, label: "Classic", dots: 2, sublabel: "Kích thước chuẩn" },
  advanced: { size: 9, label: "Advanced", dots: 3, sublabel: "Phức tạp hơn" },
  expert: { size: 10, label: "Expert", dots: 4, sublabel: "Cần suy luận" },
  ultimate: { size: 11, label: "Ultimate", dots: 5, sublabel: "Thách thức" },
  master: { size: 12, label: "Master", dots: 6, sublabel: "Cao nhất" },
};

export function randomPuzzle(difficulty: Difficulty): Puzzle {
  return generatePuzzle(DIFFICULTY_CONFIG[difficulty].size);
}

/** A wide palette of soft colours; index = region id. Supports up to 12 regions. */
export const REGION_COLORS: string[] = [
  "#F8B7BD", // pink
  "#FFD3A5", // peach
  "#FCF3A0", // pale yellow
  "#B8E8B5", // mint
  "#A8DFFB", // sky
  "#C9B1F2", // lavender
  "#FFB8E1", // rose
  "#9CC6E5", // blue
  "#D0EBA8", // lime
  "#E5C5A8", // tan
  "#B9F5C4", // green
  "#F5C2C7", // blush
];
