import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import BoardPlaceholder from "../components/BoardPlaceholder";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { BottomTabParamList } from "../navigation/types";

type Props = BottomTabScreenProps<BottomTabParamList, "Xiangqi">;

export default function XiangqiScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Button title="Back" onPress={() => navigation.goBack()} />
      <Text style={styles.title}>Xiangqi (Cờ tướng)</Text>
      <BoardPlaceholder title="Xiangqi board" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, textAlign: "center", marginVertical: 12 },
});
