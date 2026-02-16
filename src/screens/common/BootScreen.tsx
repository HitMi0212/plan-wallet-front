import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

export function BootScreen() {
  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/splash-icon.png')} style={styles.logo} resizeMode="contain" />
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
  logo: {
    width: 132,
    height: 132,
    borderRadius: 28,
  },
  text: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
});
