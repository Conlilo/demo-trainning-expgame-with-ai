import { PlayerStatus } from "./types";

export const DAN_ID = "dan";

export const STATUS_VISUAL: Record<PlayerStatus, { color: string; label: string }> = {
  bitten: { color: "#D32F2F", label: "Bị cắn" },
  protected: { color: "#1E88E5", label: "Được bảo vệ" },
  poisoned: { color: "#8E24AA", label: "Bị hạ độc" },
  revived: { color: "#43A047", label: "Được hồi sinh" },
  "hunted-target": { color: "#EF6C00", label: "Bị treo thưởng" },
  lover: { color: "#EC407A", label: "Người yêu" },
};

/** When a player has multiple statuses, the first one in this list wins. */
export const STATUS_PRIORITY: PlayerStatus[] = [
  "revived",
  "protected",
  "bitten",
  "poisoned",
  "hunted-target",
  "lover",
];
