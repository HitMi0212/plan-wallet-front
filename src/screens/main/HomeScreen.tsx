import dayjs from 'dayjs';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExpenseCategoryKind } from '../../services/categoryApi';
import { requireAuthenticatedUserId, seedDemoDataIfEmpty } from '../../services/localDb';
import { useCategoryStore } from '../../stores/categoryStore';
import { useTransactionStore } from '../../stores/transactionStore';

function classifyExpenseKind(kind?: ExpenseCategoryKind): 'SAVINGS' | 'INVEST' | 'OTHER' {
  if (kind === 'SAVINGS') return 'SAVINGS';
  if (kind === 'INVEST') return 'INVEST';
  return 'OTHER';
}

export function HomeScreen({ navigation }: { navigation: any }) {
  const { items, loading, error, load } = useTransactionStore();
  const categories = useCategoryStore((state) => state.items);
  const loadCategories = useCategoryStore((state) => state.load);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().startOf('month'));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const userId = await requireAuthenticatedUserId();
      await seedDemoDataIfEmpty(userId);
      load();
    })();
  }, [load]);

  useEffect(() => {
    if (categories.length === 0) {
      loadCategories();
    }
  }, [categories.length, loadCategories]);

  const monthItems = useMemo(() => {
    return items.filter((item) => {
      const occurred = dayjs(item.occurredAt);
      return occurred.year() === selectedMonth.year() && occurred.month() === selectedMonth.month();
    });
  }, [items, selectedMonth]);

  const categoryMap = useMemo(() => {
    return new Map(
      categories.map((category) => [
        category.id,
        { name: category.name, expenseKind: category.expenseKind ?? 'NORMAL' },
      ])
    );
  }, [categories]);

  const { incomeTotal, expenseTotal, normalExpense, monthlyAsset, savingsAmount, investAmount } = useMemo(() => {
    const income = monthItems
      .filter((item) => item.type === 'INCOME')
      .reduce((sum, item) => sum + item.amount, 0);
    const expenseItems = monthItems
      .filter((item) => item.type === 'EXPENSE')
      .map((item) => ({
        ...item,
        category: categoryMap.get(item.categoryId) ?? { name: '', expenseKind: 'NORMAL' as ExpenseCategoryKind },
      }));
    const expense = expenseItems.reduce((sum, item) => sum + item.amount, 0);
    const savings = expenseItems
      .filter((item) => {
        return classifyExpenseKind(item.category.expenseKind) === 'SAVINGS';
      })
      .reduce((sum, item) => sum + item.amount, 0);
    const invest = expenseItems
      .filter((item) => {
        return classifyExpenseKind(item.category.expenseKind) === 'INVEST';
      })
      .reduce((sum, item) => sum + item.amount, 0);
    const nonRegularExpense = savings + invest;

    return {
      incomeTotal: income,
      expenseTotal: expense,
      normalExpense: Math.max(expense - nonRegularExpense, 0),
      monthlyAsset: income - Math.max(expense - nonRegularExpense, 0),
      savingsAmount: savings,
      investAmount: invest,
    };
  }, [monthItems, categoryMap]);

  const todayItems = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    return items
      .filter((item) => dayjs(item.occurredAt).format('YYYY-MM-DD') === today)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [items]);

  const monthLabel = `${selectedMonth.year()}년 ${selectedMonth.month() + 1}월`;

  const monthOptions = useMemo(() => {
    const keySet = new Set<string>([
      dayjs().startOf('month').format('YYYY-MM'),
      dayjs().startOf('month').subtract(1, 'month').format('YYYY-MM'),
    ]);

    items.forEach((item) => {
      keySet.add(dayjs(item.occurredAt).format('YYYY-MM'));
    });

    return [...keySet]
      .map((key) => dayjs(`${key}-01`))
      .sort((a, b) => b.valueOf() - a.valueOf());
  }, [items, selectedMonth]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable onPress={() => setMonthPickerOpen(true)} style={styles.headerMonthButton}>
          <Text style={styles.headerMonthText}>{monthLabel}</Text>
        </Pressable>
      ),
      headerTitleAlign: 'center',
    });
  }, [navigation, monthLabel]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>현재 자산(이번달 실질)</Text>
        <Text style={styles.heroValue}>{monthlyAsset.toLocaleString()}원</Text>
        {savingsAmount > 0 || investAmount > 0 ? (
          <Text style={styles.savingsText}>예적금 {savingsAmount.toLocaleString()}원 · 투자 {investAmount.toLocaleString()}원</Text>
        ) : null}
        <Text style={styles.heroSub}>{monthLabel} 수입 - 일반지출</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.row}>
        <View style={[styles.statCard, styles.incomeCard]}>
          <Text style={styles.statLabel}>수입</Text>
          <Text style={[styles.statValue, styles.incomeText]}>{incomeTotal.toLocaleString()}원</Text>
        </View>
        <View style={[styles.statCard, styles.expenseCard]}>
          <Text style={styles.statLabel}>지출</Text>
          <Text style={[styles.statValue, styles.expenseText]}>{expenseTotal.toLocaleString()}원</Text>
          <Text style={styles.expenseSubText}>일반 지출 {normalExpense.toLocaleString()}원</Text>
          <Text style={styles.expenseSubText}>예적금 {savingsAmount.toLocaleString()}원</Text>
          <Text style={styles.expenseSubText}>투자 {investAmount.toLocaleString()}원</Text>
        </View>
      </View>

      <View style={styles.monthListCard}>
        <Text style={styles.monthListTitle}>금일 등록 내역</Text>
        {todayItems.length === 0 ? (
          <Text style={styles.helperText}>오늘 등록된 내역이 없습니다.</Text>
        ) : (
          <ScrollView style={styles.monthListScroll} nestedScrollEnabled>
            {todayItems.map((item) => (
              <View key={item.id} style={styles.monthItemRow}>
                <View>
                  <Text style={styles.monthItemDate}>{dayjs(item.occurredAt).format('MM.DD')}</Text>
                  <Text style={styles.monthItemCategory}>
                    {categoryMap.get(item.categoryId)?.name ?? `카테고리 ${item.categoryId}`}
                  </Text>
                </View>
                <Text style={item.type === 'INCOME' ? styles.monthItemIncome : styles.monthItemExpense}>
                  {item.type === 'INCOME' ? '+' : '-'}
                  {item.amount.toLocaleString()}원
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {loading ? <Text style={styles.helperText}>집계 중...</Text> : null}

      <Pressable style={styles.quickAddButton} onPress={() => navigation.navigate('Transactions')}>
        <Text style={styles.quickAddText}>등록</Text>
      </Pressable>

      <Modal visible={monthPickerOpen} transparent animationType="fade" onRequestClose={() => setMonthPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMonthPickerOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>월 선택</Text>
            <FlatList
              data={monthOptions}
              keyExtractor={(item) => item.format('YYYY-MM')}
              renderItem={({ item }) => {
                const label = `${item.year()}년 ${item.month() + 1}월`;
                const selected =
                  item.year() === selectedMonth.year() && item.month() === selectedMonth.month();
                return (
                  <Pressable
                    style={[styles.monthOption, selected && styles.monthOptionSelected]}
                    onPress={() => {
                      setSelectedMonth(item);
                      setMonthPickerOpen(false);
                    }}
                  >
                    <Text style={selected ? styles.monthOptionTextSelected : styles.monthOptionText}>{label}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
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
  },
  headerMonthButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  headerMonthText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  heroLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  heroValue: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
  },
  heroSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
  },
  savingsText: {
    color: '#86efac',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
  },
  incomeCard: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  expenseCard: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  statLabel: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  incomeText: {
    color: '#15803d',
  },
  expenseText: {
    color: '#b91c1c',
  },
  expenseSubText: {
    color: '#7f1d1d',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  helperText: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 6,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginBottom: 10,
  },
  monthListCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    padding: 14,
    marginBottom: 12,
    maxHeight: 300,
  },
  monthListScroll: {
    maxHeight: 220,
  },
  monthListTitle: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '700',
    marginBottom: 8,
  },
  monthItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  monthItemDate: {
    color: '#475569',
    fontWeight: '600',
  },
  monthItemCategory: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  monthItemIncome: {
    color: '#15803d',
    fontWeight: '800',
  },
  monthItemExpense: {
    color: '#b91c1c',
    fontWeight: '800',
  },
  quickAddButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#0f172a',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 2,
    marginBottom: 8,
  },
  quickAddText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxHeight: 420,
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    color: '#0f172a',
  },
  monthOption: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  monthOptionSelected: {
    backgroundColor: '#0f172a',
  },
  monthOptionText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  monthOptionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
});
