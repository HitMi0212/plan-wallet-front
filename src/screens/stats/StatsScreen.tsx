import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function StatsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>통계</Text>
      <Text>월간 합계, 전월 비교, 카테고리 합계를 구성합니다.</Text>
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
