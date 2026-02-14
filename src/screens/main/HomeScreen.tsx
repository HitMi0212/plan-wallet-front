import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthStore } from '../../stores/authStore';

export function HomeScreen({ navigation }: { navigation: any }) {
  const logout = useAuthStore((state) => state.logout);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>홈</Text>
      <View style={styles.buttonGroup}>
        <PrimaryButton title="카테고리" onPress={() => navigation.navigate('Categories')} />
        <PrimaryButton title="거래" onPress={() => navigation.navigate('Transactions')} />
        <PrimaryButton title="통계" onPress={() => navigation.navigate('Stats')} />
      </View>
      <PrimaryButton title="로그아웃" onPress={logout} />
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
    marginBottom: 24,
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 24,
  },
});
