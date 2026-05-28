import type { ToolCard } from "../../tools/data";
import { DAN_ID, STATUS_PRIORITY } from "./constants";
import type { Phase, Player, PlayerStatus } from "./types";

export function topStatus(statuses: PlayerStatus[]): PlayerStatus | null {
  for (const s of STATUS_PRIORITY) if (statuses.includes(s)) return s;
  return null;
}

export function blankPlayer(num: number): Player {
  return {
    id: String(num),
    name: `Người ${num}`,
    roleId: null,
    alive: true,
    statuses: [],
  };
}

export function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => blankPlayer(i + 1));
}

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export function defaultComposition(
  n: number,
  roles: ToolCard[]
): Record<string, number> {
  const r: Record<string, number> = {};
  for (const role of roles) r[role.id] = 0;
  r.soi = Math.max(1, Math.floor(n / 4));
  if (n >= 6) r["tien-tri"] = 1;
  if (n >= 7) r["bao-ve"] = 1;
  if (n >= 8) r["phu-thuy"] = 1;
  if (n >= 9) r["tho-san"] = 1;
  if (n >= 12) r.cupid = 1;
  const used = sum(Object.values(r));
  r[DAN_ID] = Math.max(0, n - used);
  return r;
}

/** Bitten (not protected/revived) and Poisoned (not revived) players die. */
export function applyNightDeaths(players: Player[]): Player[] {
  return players.map((p) => {
    if (!p.alive) return p;
    const revived = p.statuses.includes("revived");
    if (revived) return p;
    const protectedSelf = p.statuses.includes("protected");
    const bittenDies = p.statuses.includes("bitten") && !protectedSelf;
    const poisonedDies = p.statuses.includes("poisoned");
    return bittenDies || poisonedDies ? { ...p, alive: false } : p;
  });
}

/** Hunter / lover chains: keep applying until no more deaths cascade. */
export function applyChains(
  players: Player[],
  hunterTargetId: string | null,
  lovers: [string, string] | null
): Player[] {
  let result = players;
  let changed = true;
  while (changed) {
    changed = false;

    const hunterDead = result.some(
      (p) => p.roleId === "tho-san" && !p.alive
    );
    if (hunterDead && hunterTargetId) {
      const target = result.find((p) => p.id === hunterTargetId);
      if (target && target.alive) {
        result = result.map((p) =>
          p.id === hunterTargetId ? { ...p, alive: false } : p
        );
        changed = true;
      }
    }

    if (lovers) {
      const [a, b] = lovers;
      const pa = result.find((p) => p.id === a);
      const pb = result.find((p) => p.id === b);
      if (pa && pb) {
        if (!pa.alive && pb.alive) {
          result = result.map((p) =>
            p.id === b ? { ...p, alive: false } : p
          );
          changed = true;
        }
        if (!pb.alive && pa.alive) {
          result = result.map((p) =>
            p.id === a ? { ...p, alive: false } : p
          );
          changed = true;
        }
      }
    }
  }
  return result;
}

export function checkWinner(
  players: Player[],
  roles: ToolCard[]
): "Sói" | "Dân" | null {
  const alive = players.filter((p) => p.alive);
  if (alive.length === 0) return null;
  const wolves = alive.filter((p) => {
    const r = roles.find((x) => x.id === p.roleId);
    return r?.faction === "Sói";
  }).length;
  if (wolves === 0) return "Dân";
  if (wolves >= alive.length - wolves) return "Sói";
  return null;
}

export function phaseLabel(phase: Phase, dayNum: number): string {
  if (phase === "setup-count") return "Số người chơi";
  if (phase === "setup-names") return "Đặt tên người chơi";
  if (phase === "setup-deck") return "Chọn lá bài";
  if (phase === "night") return `Đêm ${dayNum}`;
  return `Ngày ${dayNum}`;
}
