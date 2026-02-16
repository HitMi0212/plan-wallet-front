import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { exportBackupFile, importBackupFile } from '../../services/backupService';
import { useAuthStore } from '../../stores/authStore';

export function SettingsScreen() {
  const logout = useAuthStore((state) => state.logout);
  const hydrate = useAuthStore((state) => state.hydrate);

  const handleExport = async () => {
    try {
      const result = await exportBackupFile();
      Alert.alert('백업 완료', `${result.fileName} 파일을 공유 화면에서 저장해 주세요.`);
    } catch (error) {
      Alert.alert('백업 실패', '백업 파일 생성 중 오류가 발생했습니다.');
    }
  };

  const handleImport = async () => {
    try {
      const result = await importBackupFile();
      if (result.status === 'cancelled') {
        return;
      }

      await hydrate();
      Alert.alert(
        '복원 완료',
        `사용자 ${result.counts.users}건, 카테고리 ${result.counts.categories}건, 거래 ${result.counts.transactions}건을 반영했습니다.`
      );
    } catch (error) {
      Alert.alert('복원 실패', '지원되지 않는 백업 버전이거나 파일 형식이 올바르지 않습니다.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>설정</Text>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>데이터 관리</Text>
        <PrimaryButton title="데이터 백업 파일 만들기" onPress={handleExport} />
        <PrimaryButton title="백업 파일 가져오기" onPress={handleImport} />
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
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
});
