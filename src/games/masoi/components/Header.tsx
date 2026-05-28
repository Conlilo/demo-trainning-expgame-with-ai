import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { styles } from "../styles";

type Props = {
  title: string;
  onBack: () => void;
};

export default function Header({ title, onBack }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.side} activeOpacity={0.7}>
        <Text style={styles.backText}>‹ Quay lại</Text>
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.side} />
    </View>
  );
}
