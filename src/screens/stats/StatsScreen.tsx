import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';

import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { useStatsStore } from '../../stores/statsStore';

const screenWidth = Dimensions.get('window').width;

export function StatsScreen() {
  const { monthly, comparison, categoryTotals, loading, error, load } = useStatsStore();

  const today = dayjs();
  const [year, setYear] = useState(today.year());
  const [month, setMonth] = useState(today.month() + 1);

  const moveMonth = (delta: number) => {
    setMonth((currentMonth) => {
      const nextMonth = currentMonth + delta;
      if (nextMonth < 1) {
        setYear((currentYear) => currentYear - 1);
        return 12;
      }
      if (nextMonth > 12) {
        setYear((currentYear) => currentYear + 1);
        return 1;
      }
      return nextMonth;
    });
  };

  useEffect(() => {
    load(year, month);
  }, [load, year, month]);

  const chartData = useMemo(() => {
    if (!monthly) return null;
    return {
      labels: ['수입', '지출'],
      datasets: [{ data: [monthly.incomeTotal, monthly.expenseTotal] }],
    };
  }, [monthly]);

  const pieData = useMemo(() => {
    return categoryTotals.map((item, index) => ({
      name: `#${item.categoryId}`,
      total: item.total,
      color: ['#0ea5e9', '#6366f1', '#f97316', '#10b981', '#ef4444'][index % 5],
      legendFontColor: '#334155',
      legendFontSize: 12,
    }));
  }, [categoryTotals]);

  return (
    <View style={styles.container}>

      <View style={styles.controls}>
        <Pressable style={styles.controlButton} onPress={() => moveMonth(-1)}>
          <Text style={styles.controlText}>이전</Text>
        </Pressable>
        <Text style={styles.controlLabel}>{year}년 {month}월</Text>
        <Pressable style={styles.controlButton} onPress={() => moveMonth(1)}>
          <Text style={styles.controlText}>다음</Text>
        </Pressable>
      </View>

      {loading ? <LoadingOverlay /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {!loading && !error && !monthly ? (
        <EmptyState title="통계 데이터가 없습니다." description="거래를 추가한 후 확인해 주세요." />
      ) : null}

      {monthly && chartData && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>월간 합계</Text>
          <Text style={styles.summaryText}>수입: {monthly.incomeTotal.toLocaleString()}원</Text>
          <Text style={styles.summaryText}>지출: {monthly.expenseTotal.toLocaleString()}원</Text>
          <BarChart
            data={chartData}
            width={screenWidth - 48}
            height={220}
            yAxisLabel=""
            chartConfig={chartConfig}
            fromZero
            style={styles.chart}
          />
        </View>
      )}

      {comparison && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>전월 비교</Text>
          <Text style={styles.summaryText}>이번 달 수입: {comparison.incomeTotal.toLocaleString()}원</Text>
          <Text style={styles.summaryText}>전월 수입: {comparison.prevIncomeTotal.toLocaleString()}원</Text>
          <Text style={styles.summaryText}>이번 달 지출: {comparison.expenseTotal.toLocaleString()}원</Text>
          <Text style={styles.summaryText}>전월 지출: {comparison.prevExpenseTotal.toLocaleString()}원</Text>
        </View>
      )}

      {pieData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>카테고리 합계</Text>
          <PieChart
            data={pieData.map((item) => ({
              name: item.name,
              population: item.total,
              color: item.color,
              legendFontColor: item.legendFontColor,
              legendFontSize: item.legendFontSize,
            }))}
            width={screenWidth - 48}
            height={220}
            accessor="population"
            chartConfig={chartConfig}
            backgroundColor="transparent"
            paddingLeft="15"
          />
        </View>
      )}
    </View>
  );
}

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
};

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
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5f5',
  },
  controlText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  controlLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  info: {
    marginBottom: 8,
    color: '#64748b',
  },
  error: {
    color: '#ef4444',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
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
  },
  chart: {
    marginTop: 8,
    borderRadius: 12,
  },
});
