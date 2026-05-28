export type Phase = "setup-count" | "setup-names" | "setup-deck" | "night" | "day";
export type NightSubStep = "identify" | "action";

export type PlayerStatus =
  | "lover"
  | "bitten"
  | "protected"
  | "poisoned"
  | "revived"
  | "hunted-target";

export type Player = {
  id: string;
  name: string;
  roleId: string | null;
  alive: boolean;
  statuses: PlayerStatus[];
};

export type Reveal = { playerId: string; faction: "Sói" | "Dân" } | null;
export type LoverReveal = [string, string] | null;
