import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function BoardPlaceholder({ title }: { title: string }) {
  return (
    <View style={styles.board}>
      <Text>{title} — board placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flex: 1, alignItems: "center", justifyContent: "center" },
});
