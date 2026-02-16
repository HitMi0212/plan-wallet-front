import dayjs from 'dayjs';
import React, { useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { ExpenseCategoryKind } from '../../services/categoryApi';
import { useCategoryStore } from '../../stores/categoryStore';
import { useTransactionStore } from '../../stores/transactionStore';

function classifyExpenseKind(kind?: ExpenseCategoryKind): 'SAVINGS' | 'INVEST' | 'OTHER' {
  if (kind === 'SAVINGS') return 'SAVINGS';
  if (kind === 'INVEST') return 'INVEST';
  return 'OTHER';
}

export function AssetFlowScreen() {
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

  const monthStart = dayjs().startOf('month');
  const monthLabel = `${monthStart.year()}년 ${monthStart.month() + 1}월`;

  const categoryMap = useMemo(() => {
    return new Map(
      categories.map((category) => [
        category.id,
        { name: category.name, expenseKind: category.expenseKind ?? 'NORMAL' },
      ])
    );
  }, [categories]);

  const monthSpecialItems = useMemo(() => {
    return items
      .filter((item) => {
        const occurred = dayjs(item.occurredAt);
        return occurred.year() === monthStart.year() && occurred.month() === monthStart.month();
      })
      .filter((item) => {
        const category = categoryMap.get(item.categoryId);
        return classifyExpenseKind(category?.expenseKind) !== 'OTHER';
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [items, monthStart, categoryMap]);

  const { savingsTotal, investTotal } = useMemo(() => {
    return monthSpecialItems.reduce(
      (acc, item) => {
        const category = categoryMap.get(item.categoryId);
        const group = classifyExpenseKind(category?.expenseKind);
        if (group === 'SAVINGS') acc.savingsTotal += item.amount;
        if (group === 'INVEST') acc.investTotal += item.amount;
        return acc;
      },
      { savingsTotal: 0, investTotal: 0 }
    );
  }, [monthSpecialItems, categoryMap]);

  return (
    <View style={styles.container}>
      <Text style={styles.summaryTitle}>{monthLabel} 예적금/투자 지출</Text>
      <View style={styles.summaryCard}>
        <Text style={styles.savingsText}>예적금 {savingsTotal.toLocaleString()}원</Text>
        <Text style={styles.investText}>투자 {investTotal.toLocaleString()}원</Text>
      </View>

      <FlatList
        data={monthSpecialItems}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title="예적금/투자 내역이 없습니다." description="거래에 관련 카테고리를 등록해 보세요." />
        }
        renderItem={({ item }) => {
          const category = categoryMap.get(item.categoryId);
          const categoryName = category?.name ?? `카테고리 ${item.categoryId}`;
          const group = classifyExpenseKind(category?.expenseKind);
          return (
            <View style={styles.item}>
              <View>
                <Text style={styles.itemTitle}>{categoryName}</Text>
                <Text style={styles.itemMeta}>{dayjs(item.occurredAt).format('YYYY-MM-DD')}</Text>
              </View>
              <Text style={group === 'SAVINGS' ? styles.itemAmountSavings : styles.itemAmountInvest}>
                {item.amount.toLocaleString()}원
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    color: '#0f172a',
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  savingsText: {
    color: '#15803d',
    fontWeight: '800',
    fontSize: 16,
  },
  investText: {
    color: '#0369a1',
    fontWeight: '800',
    fontSize: 16,
  },
  list: {
    paddingBottom: 40,
  },
  item: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '700',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  itemAmountSavings: {
    color: '#15803d',
    fontWeight: '800',
    fontSize: 14,
  },
  itemAmountInvest: {
    color: '#0369a1',
    fontWeight: '800',
    fontSize: 14,
  },
});
