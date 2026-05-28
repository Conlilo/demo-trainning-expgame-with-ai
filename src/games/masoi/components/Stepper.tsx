import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { styles } from "../styles";

type Props = {
  value: number;
  onDelta: (delta: number) => void;
};

export default function Stepper({ value, onDelta }: Props) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        onPress={() => onDelta(-1)}
        activeOpacity={0.7}
        style={styles.stepBtn}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}</Text>
      <TouchableOpacity
        onPress={() => onDelta(1)}
        activeOpacity={0.7}
        style={styles.stepBtn}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
