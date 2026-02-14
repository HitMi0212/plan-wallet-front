import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function CategoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>카테고리</Text>
      <Text>카테고리 목록/추가/수정/삭제 화면을 구성합니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
});
