import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { useCategoryStore } from '../../stores/categoryStore';
import { useStatsStore } from '../../stores/statsStore';
import { useTransactionStore } from '../../stores/transactionStore';

const screenWidth = Dimensions.get('window').width;
const chartCardWidth = screenWidth - 48;
const cardInnerWidth = chartCardWidth - 32;

export function StatsScreen() {
  const { monthly, comparison, categoryTotals, loading, error, load } = useStatsStore();
  const transactions = useTransactionStore((state) => state.items);
  const loadTransactions = useTransactionStore((state) => state.load);
  const categories = useCategoryStore((state) => state.items);
  const loadCategories = useCategoryStore((state) => state.load);

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

  useEffect(() => {
    if (categories.length === 0) {
      loadCategories();
    }
  }, [categories.length, loadCategories]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const expenseCategoryMap = useMemo(() => {
    return new Map(
      categories
        .filter((category) => category.type === 'EXPENSE')
        .map((category) => [category.id, category.name])
    );
  }, [categories]);

  const categoryExpenseTotals = useMemo(() => {
    return categoryTotals
      .filter((item) => item.total > 0)
      .map((item) => {
        const name = expenseCategoryMap.get(item.categoryId);
        if (!name) return null;
        return { ...item, name };
      })
      .filter((item): item is { categoryId: number; total: number; name: string } => item !== null)
      .sort((a, b) => b.total - a.total);
  }, [categoryTotals, expenseCategoryMap]);

  const pieData = useMemo(() => {
    return categoryExpenseTotals.map((item, index) => ({
      name: item.name,
      total: item.total,
      color: ['#0ea5e9', '#6366f1', '#f97316', '#10b981', '#ef4444'][index % 5],
      legendFontColor: '#334155',
      legendFontSize: 12,
    }));
  }, [categoryExpenseTotals]);

  const maxExpenseDaySummary = useMemo(() => {
    const monthExpenseItems = transactions.filter((item) => {
      const d = dayjs(item.occurredAt);
      return item.type === 'EXPENSE' && d.year() === year && d.month() + 1 === month;
    });
    if (monthExpenseItems.length === 0) return null;

    const dayTotalMap = new Map<string, number>();
    monthExpenseItems.forEach((item) => {
      const dayKey = dayjs(item.occurredAt).format('YYYY-MM-DD');
      dayTotalMap.set(dayKey, (dayTotalMap.get(dayKey) ?? 0) + item.amount);
    });
    const maxDayEntry = [...dayTotalMap.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!maxDayEntry) return null;

    const [maxDay, maxDayTotal] = maxDayEntry;
    const dayItems = monthExpenseItems.filter(
      (item) => dayjs(item.occurredAt).format('YYYY-MM-DD') === maxDay
    );
    const categoryTotalMap = new Map<number, number>();
    dayItems.forEach((item) => {
      categoryTotalMap.set(item.categoryId, (categoryTotalMap.get(item.categoryId) ?? 0) + item.amount);
    });
    const categoryItems = [...categoryTotalMap.entries()]
      .map(([categoryId, categoryAmount]) => ({
        categoryId,
        categoryAmount,
        categoryName: expenseCategoryMap.get(categoryId) ?? `카테고리 ${categoryId}`,
      }))
      .sort((a, b) => b.categoryAmount - a.categoryAmount);
    if (categoryItems.length === 0) {
      return {
        date: maxDay,
        total: maxDayTotal,
        categories: [] as Array<{ categoryId: number; categoryName: string; categoryAmount: number }>,
      };
    }

    return {
      date: maxDay,
      total: maxDayTotal,
      categories: categoryItems,
    };
  }, [transactions, year, month, expenseCategoryMap]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {loading ? <LoadingOverlay /> : null}
      {error ? <ErrorBanner message={error} /> : null}

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

      {monthly ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{year}년 {month}월 최대 지출일</Text>
          <View style={styles.monthSummaryRow}>
            <Text style={styles.incomeSummaryText}>수입 {monthly.incomeTotal.toLocaleString()}원</Text>
            <Text style={styles.expenseSummaryText}>지출 {monthly.expenseTotal.toLocaleString()}원</Text>
          </View>
          {maxExpenseDaySummary ? (
            <View style={styles.maxExpenseCard}>
              <Text style={styles.maxExpenseDate}>{maxExpenseDaySummary.date}</Text>
              {maxExpenseDaySummary.categories.map((item) => (
                <View key={item.categoryId} style={styles.maxExpenseRow}>
                  <Text style={styles.maxExpenseCategory}>{item.categoryName}</Text>
                  <Text style={styles.maxExpenseAmount}>{item.categoryAmount.toLocaleString()}원</Text>
                </View>
              ))}
              <Text style={styles.maxExpenseTotal}>당일 총 지출 {maxExpenseDaySummary.total.toLocaleString()}원</Text>
            </View>
          ) : (
            <Text style={styles.helperText}>선택한 달의 지출 내역이 없습니다.</Text>
          )}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{year}년 {month}월 카테고리별 소비 통계</Text>
        {pieData.length > 0 ? (
          <>
              <PieChart
                data={pieData.map((item) => ({
                  name: item.name,
                  population: item.total,
                  color: item.color,
                  legendFontColor: item.legendFontColor,
                  legendFontSize: item.legendFontSize,
                }))}
                width={cardInnerWidth}
                height={220}
                accessor="population"
                chartConfig={chartConfig}
                backgroundColor="transparent"
              paddingLeft="8"
            />
            <View style={styles.categoryListWrap}>
              {categoryExpenseTotals.map((item) => (
                <View key={item.categoryId} style={styles.categoryRow}>
                  <Text style={styles.categoryName}>{item.name}</Text>
                  <Text style={styles.categoryAmount}>{item.total.toLocaleString()}원</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.helperText}>카테고리 소비 내역이 없습니다.</Text>
        )}
      </View>

      {comparison ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>전월 비교</Text>
          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>수입</Text>
            <Text style={styles.compareValue}>이번 달 {comparison.incomeTotal.toLocaleString()}원</Text>
            <Text style={styles.comparePrevValue}>전월 {comparison.prevIncomeTotal.toLocaleString()}원</Text>
          </View>
          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>지출</Text>
            <Text style={styles.compareValue}>이번 달 {comparison.expenseTotal.toLocaleString()}원</Text>
            <Text style={styles.comparePrevValue}>전월 {comparison.prevExpenseTotal.toLocaleString()}원</Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  decimalPlaces: 0,
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
  monthSummaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  incomeSummaryText: {
    color: '#15803d',
    fontWeight: '800',
    fontSize: 14,
  },
  expenseSummaryText: {
    color: '#b91c1c',
    fontWeight: '800',
    fontSize: 14,
  },
  helperText: {
    fontSize: 13,
    color: '#64748b',
  },
  maxExpenseCard: {
    marginTop: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  maxExpenseDate: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 6,
  },
  maxExpenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  maxExpenseCategory: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  maxExpenseAmount: {
    fontSize: 13,
    color: '#b91c1c',
    fontWeight: '700',
    marginBottom: 2,
  },
  maxExpenseTotal: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  categoryListWrap: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    gap: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  categoryAmount: {
    fontSize: 14,
    color: '#b91c1c',
    fontWeight: '800',
  },
  compareRow: {
    marginBottom: 10,
    gap: 2,
  },
  compareLabel: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '700',
  },
  compareValue: {
    fontSize: 13,
    color: '#0f172a',
  },
  comparePrevValue: {
    fontSize: 13,
    color: '#475569',
  },
});
