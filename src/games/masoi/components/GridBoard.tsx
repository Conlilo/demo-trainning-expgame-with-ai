import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { ToolCard } from "../../../tools/data";
import { DAN_ID, STATUS_VISUAL } from "../constants";
import { topStatus } from "../helpers";
import type { Player } from "../types";
import { styles } from "../styles";

export type GridBoardProps = {
  players: Player[];
  /** Multi-selection: outlines all listed players. */
  selectedIds?: string[];
  markedRoleId?: string | null;
  lockOthers?: boolean;
  /** When set, only these players can be tapped; others appear dimmed. */
  selectableIds?: string[];
  showRoles?: boolean;
  roles?: ToolCard[];
  onTap?: (id: string) => void;
};

export default function GridBoard({
  players,
  selectedIds = [],
  markedRoleId = null,
  lockOthers = false,
  selectableIds,
  showRoles = true,
  roles,
  onTap,
}: GridBoardProps) {
  const cols = players.length <= 6 ? 2 : players.length <= 12 ? 3 : 4;
  const selectedSet = new Set(selectedIds);

  return (
    <View style={styles.gridArea}>
      <View style={styles.gridRow}>
        {players.map((p) => {
          const role = roles?.find((r) => r.id === p.roleId);
          const isSelected = selectedSet.has(p.id);
          const isLockedOther =
            lockOthers && p.roleId != null && p.roleId !== markedRoleId;
          const isUnselectable =
            selectableIds != null && !selectableIds.includes(p.id);
          const isDead = !p.alive;
          const disabled = isDead || isLockedOther || isUnselectable || !onTap;

          let bgStyle: any = styles.seatDefault;
          if (showRoles && role) {
            if (role.faction === "Sói") bgStyle = styles.seatWolf;
            else if (role.id !== DAN_ID) bgStyle = styles.seatSpecial;
          }

          const status = topStatus(p.statuses);
          const statusColor = status ? STATUS_VISUAL[status].color : undefined;

          const subLabel = isDead
            ? "✕ chết"
            : status
            ? STATUS_VISUAL[status].label
            : showRoles && role
            ? role.name
            : isLockedOther && role
            ? role.name
            : null;

          return (
            <View
              key={p.id}
              style={[styles.gridCell, { width: `${100 / cols}%` }]}
            >
              <TouchableOpacity
                onPress={onTap ? () => onTap(p.id) : undefined}
                disabled={disabled}
                activeOpacity={0.7}
                style={{
                  opacity: isDead
                    ? 0.45
                    : isLockedOther || isUnselectable
                    ? 0.45
                    : 1,
                }}
              >
                <View
                  style={[
                    styles.gridSeat,
                    bgStyle,
                    isSelected && styles.seatSelected,
                    statusColor != null && {
                      borderColor: statusColor,
                      borderWidth: 3,
                    },
                  ]}
                >
                  <Text style={styles.gridSeatNum}>#{p.id}</Text>
                  <Text style={styles.gridSeatName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {subLabel != null && (
                    <Text
                      style={[
                        styles.gridSeatSubLabel,
                        isDead && styles.deadText,
                        status != null && {
                          color: STATUS_VISUAL[status].color,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {subLabel}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}
