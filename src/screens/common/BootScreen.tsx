import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function BootScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0f172a" />
      <Text style={styles.text}>세션을 불러오는 중입니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  text: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
});
