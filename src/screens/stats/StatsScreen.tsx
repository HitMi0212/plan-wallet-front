import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';

import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { useStatsStore } from '../../stores/statsStore';

const screenWidth = Dimensions.get('window').width;

export function StatsScreen() {
  const { monthly, comparison, categoryTotals, dailyTotals, loading, error, load } = useStatsStore();

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

  const dailyChartData = useMemo(() => {
    if (!dailyTotals || dailyTotals.length === 0) return null;
    const labels = dailyTotals.map((item) => {
      const day = dayjs(item.date).date();
      return day === 1 || day % 5 === 0 ? `${day}` : '';
    });
    return {
      labels,
      datasets: [
        {
          data: dailyTotals.map((item) => item.incomeTotal),
          color: () => '#16a34a',
          strokeWidth: 2,
        },
        {
          data: dailyTotals.map((item) => item.expenseTotal),
          color: () => '#dc2626',
          strokeWidth: 2,
        },
      ],
      legend: ['수입', '지출'],
    };
  }, [dailyTotals]);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {loading ? <LoadingOverlay /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {monthly ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>월간 합계</Text>
          <Text style={styles.summaryText}>수입: {monthly.incomeTotal.toLocaleString()}원</Text>
          <Text style={styles.summaryText}>지출: {monthly.expenseTotal.toLocaleString()}원</Text>
        </View>
      ) : null}

      <View style={styles.controls}>
        <Pressable style={styles.controlButton} onPress={() => moveMonth(-1)}>
          <Text style={styles.controlText}>이전</Text>
        </Pressable>
        <Text style={styles.controlLabel}>{year}년 {month}월</Text>
        <Pressable style={styles.controlButton} onPress={() => moveMonth(1)}>
          <Text style={styles.controlText}>다음</Text>
        </Pressable>
      </View>

      {!loading && !error && !monthly ? (
        <EmptyState title="통계 데이터가 없습니다." description="거래를 추가한 후 확인해 주세요." />
      ) : null}

      {monthly && dailyChartData && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>월간 차트(일별)</Text>
          <LineChart
            data={dailyChartData}
            width={screenWidth - 48}
            height={240}
            yAxisLabel=""
            chartConfig={chartConfig}
            fromZero
            bezier={false}
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
    </ScrollView>
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
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
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
