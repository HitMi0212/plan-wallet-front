import dayjs from 'dayjs';
import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useCategoryStore } from '../../stores/categoryStore';
import { useTransactionStore } from '../../stores/transactionStore';

export function TotalWealthScreen() {
  const { items, load } = useTransactionStore();
  const categories = useCategoryStore((state) => state.items);
  const loadCategories = useCategoryStore((state) => state.load);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (categories.length === 0) {
      loadCategories();
    }
  }, [categories.length, loadCategories]);

  const categoryMap = useMemo(() => {
    return new Map(
      categories.map((category) => [
        category.id,
        { name: category.name, expenseKind: category.expenseKind ?? 'NORMAL' as const },
      ])
    );
  }, [categories]);

  const totals = useMemo(() => {
    const totalIncome = items
      .filter((item) => item.type === 'INCOME')
      .reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = items
      .filter((item) => item.type === 'EXPENSE')
      .reduce((sum, item) => sum + item.amount, 0);

    const savingsExpense = items
      .filter((item) => item.type === 'EXPENSE')
      .filter((item) => categoryMap.get(item.categoryId)?.expenseKind === 'SAVINGS')
      .reduce((sum, item) => sum + item.amount, 0);
    const investExpense = items
      .filter((item) => item.type === 'EXPENSE')
      .filter((item) => categoryMap.get(item.categoryId)?.expenseKind === 'INVEST')
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      totalIncome,
      totalExpense,
      netWealth: totalIncome - totalExpense,
      savingsExpense,
      investExpense,
    };
  }, [items, categoryMap]);

  const thisMonth = dayjs().startOf('month');
  const monthNet = useMemo(() => {
    const monthItems = items.filter((item) => {
      const d = dayjs(item.occurredAt);
      return d.year() === thisMonth.year() && d.month() === thisMonth.month();
    });
    const income = monthItems
      .filter((item) => item.type === 'INCOME')
      .reduce((sum, item) => sum + item.amount, 0);
    const normalExpense = monthItems
      .filter((item) => item.type === 'EXPENSE')
      .filter((item) => {
        const kind = categoryMap.get(item.categoryId)?.expenseKind ?? 'NORMAL';
        return kind === 'NORMAL';
      })
      .reduce((sum, item) => sum + item.amount, 0);

    return income - normalExpense;
  }, [items, categoryMap, thisMonth]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.mainCard}>
        <Text style={styles.title}>총 재산</Text>
        <Text style={styles.value}>{totals.netWealth.toLocaleString()}원</Text>
        <Text style={styles.sub}>누적 수입 - 누적 지출</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>누적 수입</Text>
        <Text style={styles.income}>{totals.totalIncome.toLocaleString()}원</Text>
        <Text style={styles.label}>누적 지출</Text>
        <Text style={styles.expense}>{totals.totalExpense.toLocaleString()}원</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>누적 예적금 지출</Text>
        <Text style={styles.savings}>{totals.savingsExpense.toLocaleString()}원</Text>
        <Text style={styles.label}>누적 투자 지출</Text>
        <Text style={styles.invest}>{totals.investExpense.toLocaleString()}원</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>이번달 실질 자산(수입-일반지출)</Text>
        <Text style={styles.valueSmall}>{monthNet.toLocaleString()}원</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  mainCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
  },
  title: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  value: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
  },
  sub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 4,
  },
  label: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  income: {
    color: '#15803d',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  expense: {
    color: '#b91c1c',
    fontSize: 18,
    fontWeight: '800',
  },
  savings: {
    color: '#15803d',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  invest: {
    color: '#0369a1',
    fontSize: 16,
    fontWeight: '800',
  },
  valueSmall: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
  },
});
