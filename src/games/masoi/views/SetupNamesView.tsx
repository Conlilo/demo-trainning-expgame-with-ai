import React from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import type { Player } from "../types";
import { styles } from "../styles";

type Props = {
  players: Player[];
  onChangeName: (id: string, name: string) => void;
  onBack: () => void;
  onContinue: () => void;
};

export default function SetupNamesView({
  players,
  onChangeName,
  onBack,
  onContinue,
}: Props) {
  const cols = players.length <= 6 ? 2 : 3;
  return (
    <View>
      <TouchableOpacity onPress={onBack} style={styles.subBackBtn} activeOpacity={0.7}>
        <Text style={styles.subBackText}>‹ Đổi số người chơi</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Đặt tên cho từng người</Text>
        <Text style={styles.gridHint}>
          Nhập tên cho mỗi ghế. Có thể bỏ trống — hệ thống sẽ dùng tên mặc định.
        </Text>

        <View style={styles.nameGrid}>
          {players.map((p) => (
            <View key={p.id} style={[styles.nameCell, { width: `${100 / cols}%` }]}>
              <View style={styles.nameCellInner}>
                <Text style={styles.nameSeatNum}>#{p.id}</Text>
                <TextInput
                  value={p.name}
                  onChangeText={(t) => onChangeName(p.id, t)}
                  placeholder={`Người ${p.id}`}
                  placeholderTextColor="#7A736A"
                  style={styles.nameInput}
                  maxLength={16}
                  returnKeyType="next"
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        onPress={onContinue}
        activeOpacity={0.85}
        style={styles.primaryBtn}
      >
        <Text style={styles.primaryBtnText}>Tiếp tục · chọn lá bài ▸</Text>
      </TouchableOpacity>
    </View>
  );
}
