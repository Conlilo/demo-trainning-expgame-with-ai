import React from "react";
import { View, Text } from "react-native";
import type { ToolCard } from "../../../tools/data";
import { styles } from "../styles";

type Props = {
  step: number;
  total: number;
  role: ToolCard;
  tag: string;
};

export default function RoleBanner({ step, total, role, tag }: Props) {
  return (
    <View style={styles.nightHeader}>
      <Text style={styles.nightProgress}>
        Vai {step + 1} / {total} · {tag}
      </Text>
      <Text style={styles.nightRoleName}>{role.name}</Text>
      <Text
        style={[
          styles.roleFaction,
          role.faction === "Sói" ? styles.factionWolf : styles.factionVillager,
        ]}
      >
        {role.group}
      </Text>
    </View>
  );
}
