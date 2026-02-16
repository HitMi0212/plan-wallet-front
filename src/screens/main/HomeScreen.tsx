import dayjs from 'dayjs';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { useSummaryStore } from '../../stores/summaryStore';

export function HomeScreen({ navigation }: { navigation: any }) {
  const { monthly, loading, load, error } = useSummaryStore();

  const reloadSummary = () => {
    const now = dayjs();
    load(now.year(), now.month() + 1);
  };

  useEffect(() => {
    reloadSummary();
  }, [load]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>홈</Text>
      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>이번 달 요약</Text>
        {loading ? (
          <Text style={styles.summaryText}>불러오는 중...</Text>
        ) : error ? (
          <>
            <Text style={styles.summaryText}>{error}</Text>
            <PrimaryButton title="다시 시도" onPress={reloadSummary} />
          </>
        ) : monthly ? (
          <>
            <Text style={styles.summaryText}>수입 {monthly.incomeTotal.toLocaleString()}원</Text>
            <Text style={styles.summaryText}>지출 {monthly.expenseTotal.toLocaleString()}원</Text>
          </>
        ) : (
          <Text style={styles.summaryText}>아직 집계된 내역이 없습니다.</Text>
        )}
      </View>
      <View style={styles.buttonGroup}>
        <PrimaryButton title="카테고리" onPress={() => navigation.navigate('Categories')} />
        <PrimaryButton title="거래" onPress={() => navigation.navigate('Transactions')} />
        <PrimaryButton title="통계" onPress={() => navigation.navigate('Stats')} />
        <PrimaryButton title="설정" onPress={() => navigation.navigate('Settings')} />
      </View>
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
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#0f172a',
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 24,
  },
});
