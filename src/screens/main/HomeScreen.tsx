import dayjs from 'dayjs';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ExpenseCategoryKind } from '../../services/categoryApi';
import { requireAuthenticatedUserId, seedDemoDataIfEmpty } from '../../services/localDb';
import { TransactionType } from '../../services/transactionApi';
import { useCategoryStore } from '../../stores/categoryStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';

function classifyExpenseKind(kind?: ExpenseCategoryKind): 'SAVINGS' | 'INVEST' | 'OTHER' {
  if (kind === 'SAVINGS') return 'SAVINGS';
  if (kind === 'INVEST') return 'INVEST';
  return 'OTHER';
}

export function HomeScreen({ navigation }: { navigation: any }) {
  const { items, loading, error, load, add } = useTransactionStore();
  const categories = useCategoryStore((state) => state.items);
  const loadCategories = useCategoryStore((state) => state.load);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().startOf('month'));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailModalType, setDetailModalType] = useState<TransactionType>('INCOME');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [occurredDateInput, setOccurredDateInput] = useState(dayjs().format('YYYY-MM-DD'));
  const [refreshing, setRefreshing] = useState(false);

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

  useFocusEffect(
    React.useCallback(() => {
      load();
      loadCategories();
    }, [load, loadCategories])
  );

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
      monthlyAsset: income - expense,
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
  const detailItems = useMemo(() => {
    return monthItems
      .filter((item) => item.type === detailModalType)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [monthItems, detailModalType]);

  const monthLabel = `${selectedMonth.year()}년 ${selectedMonth.month() + 1}월`;
  const isCurrentMonth =
    selectedMonth.year() === dayjs().year() && selectedMonth.month() === dayjs().month();
  const heroLabel = isCurrentMonth ? '현재 자산(이번달)' : `${selectedMonth.month() + 1}월 소비 총 합`;
  const heroValue = isCurrentMonth ? monthlyAsset : -expenseTotal;
  const heroSub = isCurrentMonth
    ? `${monthLabel} 수입 - 전체지출(예적금/투자 포함)`
    : `${monthLabel} 지출 합계`;
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );
  const addCategories = useMemo(
    () => sortedCategories.filter((category) => category.type === type),
    [sortedCategories, type]
  );
  const monthCategoryTotals = useMemo(() => {
    const totals = new Map<
      number,
      { categoryName: string; type: TransactionType; total: number }
    >();

    monthItems.forEach((item) => {
      const prev = totals.get(item.categoryId);
      const categoryName = categoryMap.get(item.categoryId)?.name ?? `카테고리 ${item.categoryId}`;
      if (prev) {
        prev.total += item.amount;
      } else {
        totals.set(item.categoryId, {
          categoryName,
          type: item.type,
          total: item.amount,
        });
      }
    });

    return [...totals.values()].sort((a, b) => b.total - a.total);
  }, [monthItems, categoryMap]);
  const parseDateInputToIso = (value: string) => {
    const normalized = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
    const parsed = dayjs(normalized);
    if (!parsed.isValid() || parsed.format('YYYY-MM-DD') !== normalized) return null;
    return parsed.hour(12).minute(0).second(0).millisecond(0).toISOString();
  };

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

  useEffect(() => {
    if (selectedCategoryId === null) return;
    const selected = categories.find((category) => category.id === selectedCategoryId);
    if (!selected || selected.type !== type) {
      setSelectedCategoryId(null);
    }
  }, [type, selectedCategoryId, categories]);

  const resetAddForm = () => {
    setType('EXPENSE');
    setAmount('');
    setSelectedCategoryId(null);
    setMemo('');
    setOccurredDateInput(dayjs().format('YYYY-MM-DD'));
  };

  const handleAdd = async () => {
    const parsedAmount = Number(amount);
    const parsedCategory = selectedCategoryId ?? 0;

    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('입력 오류', '금액을 올바르게 입력해 주세요.');
      return;
    }
    if (!parsedCategory || parsedCategory <= 0) {
      Alert.alert('입력 오류', '카테고리를 선택해 주세요.');
      return;
    }
    const parsedOccurredAt = parseDateInputToIso(occurredDateInput);
    if (!parsedOccurredAt) {
      Alert.alert('입력 오류', '발생일은 YYYY-MM-DD 형식으로 입력해 주세요.');
      return;
    }

    await add({
      type,
      amount: parsedAmount,
      categoryId: parsedCategory,
      memo: memo.trim() || null,
      occurredAt: parsedOccurredAt,
    });

    setAddModalVisible(false);
    resetAddForm();
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(), loadCategories()]);
    } finally {
      setRefreshing(false);
    }
  }, [load, loadCategories]);

  const closeAddModal = () => {
    setAddModalVisible(false);
  };
  const openDetailModal = (nextType: TransactionType) => {
    setDetailModalType(nextType);
    setDetailModalVisible(true);
  };
  const closeDetailModal = () => {
    setDetailModalVisible(false);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable onPress={() => setMonthPickerOpen(true)} style={styles.headerMonthButton}>
          <Text style={styles.headerMonthText}>{monthLabel} ▼</Text>
        </Pressable>
      ),
      headerTitleAlign: 'center',
    });
  }, [navigation, monthLabel]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>{heroLabel}</Text>
        <Text style={styles.heroValue}>{heroValue.toLocaleString()}원</Text>
        {savingsAmount > 0 || investAmount > 0 ? (
          <Text style={styles.savingsText}>예적금 {savingsAmount.toLocaleString()}원 · 투자 {investAmount.toLocaleString()}원</Text>
        ) : null}
        <Text style={styles.heroSub}>{heroSub}</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.row}>
        <Pressable
          style={[styles.statCard, styles.incomeCard]}
          onPress={() => openDetailModal('INCOME')}
        >
          <Text style={styles.statLabel}>수입</Text>
          <Text style={[styles.statValue, styles.incomeText]}>{incomeTotal.toLocaleString()}원</Text>
        </Pressable>
        <Pressable
          style={[styles.statCard, styles.expenseCard]}
          onPress={() => openDetailModal('EXPENSE')}
        >
          <Text style={styles.statLabel}>지출</Text>
          <Text style={[styles.statValue, styles.expenseText]}>{expenseTotal.toLocaleString()}원</Text>
          <Text style={styles.expenseSubText}>일반 지출 {normalExpense.toLocaleString()}원</Text>
          <Text style={styles.expenseSubText}>예적금 {savingsAmount.toLocaleString()}원</Text>
          <Text style={styles.expenseSubText}>투자 {investAmount.toLocaleString()}원</Text>
        </Pressable>
      </View>

      {isCurrentMonth ? (
        <View style={styles.monthListCard}>
          <View style={styles.monthListHeader}>
            <Text style={styles.monthListTitle}>금일 소비 ({dayjs().format('M월 D일')})</Text>
            <Pressable
              style={styles.inlineAddButton}
              onPress={() => {
                resetAddForm();
                setAddModalVisible(true);
              }}
            >
              <Text style={styles.inlineAddText}>등록</Text>
            </Pressable>
          </View>
          {todayItems.length === 0 ? (
            <Text style={styles.helperText}>오늘 등록된 내역이 없습니다.</Text>
          ) : (
            <ScrollView style={styles.monthListScroll} nestedScrollEnabled>
              {todayItems.map((item) => (
                <View key={item.id} style={styles.monthItemRow}>
                  <View>
                    <Text style={styles.monthItemCategory}>
                      {categoryMap.get(item.categoryId)?.name ?? `카테고리 ${item.categoryId}`}
                    </Text>
                    {item.memo ? <Text style={styles.monthItemMemo}>{item.memo}</Text> : null}
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
      ) : (
        <View style={styles.monthListCard}>
          <Text style={styles.monthListTitle}>{monthLabel} 카테고리별 합계</Text>
          {monthCategoryTotals.length === 0 ? (
            <Text style={styles.helperText}>선택한 달의 내역이 없습니다.</Text>
          ) : (
            <View style={styles.categoryTotalWrap}>
              {monthCategoryTotals.map((item, index) => (
                <View key={`${item.categoryName}-${index}`} style={styles.categoryTotalRow}>
                  <Text style={styles.categoryTotalName}>{item.categoryName}</Text>
                  <Text style={item.type === 'INCOME' ? styles.categoryTotalIncome : styles.categoryTotalExpense}>
                    {item.type === 'INCOME' ? '+' : '-'}
                    {item.total.toLocaleString()}원
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {loading ? <Text style={styles.helperText}>집계 중...</Text> : null}

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

      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeAddModal}
      >
        <View style={styles.addModalBackdrop}>
          <View style={styles.addModalCard}>
            <ScrollView contentContainerStyle={styles.addModalContentContainer}>
              <View style={styles.addModalHeader}>
                <Text style={styles.modalTitle}>거래 등록</Text>
                <Pressable style={styles.addModalCloseButton} onPress={closeAddModal}>
                  <Text style={styles.addModalCloseText}>X</Text>
                </Pressable>
              </View>
              <View style={styles.typeRow}>
                <Pressable
                  style={[styles.typeChip, type === 'EXPENSE' && styles.typeChipActive]}
                  onPress={() => setType('EXPENSE')}
                >
                  <Text style={type === 'EXPENSE' ? styles.typeChipTextActive : styles.typeChipText}>지출</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeChip, type === 'INCOME' && styles.typeChipActive]}
                  onPress={() => setType('INCOME')}
                >
                  <Text style={type === 'INCOME' ? styles.typeChipTextActive : styles.typeChipText}>수입</Text>
                </Pressable>
              </View>
              <TextField label="금액" value={amount} onChangeText={setAmount} placeholder="예: 12000" />
              <View style={styles.categorySection}>
                <Text style={styles.categoryLabel}>카테고리</Text>
                <View style={styles.categoryRow}>
                  {addCategories.map((category) => (
                    <Pressable
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        category.type === 'EXPENSE' ? styles.categoryChipExpense : styles.categoryChipIncome,
                        category.type === 'EXPENSE' && selectedCategoryId === category.id ? styles.categoryChipExpenseActive : null,
                        category.type === 'INCOME' && selectedCategoryId === category.id ? styles.categoryChipIncomeActive : null,
                        selectedCategoryId === category.id && styles.categoryChipActive,
                      ]}
                      onPress={() => setSelectedCategoryId(category.id)}
                    >
                      <Text
                        style={
                          selectedCategoryId === category.id ? styles.categoryChipTextActive : styles.categoryChipText
                        }
                      >
                        {category.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {addCategories.length === 0 ? (
                  <Text style={styles.helperText}>{type === 'EXPENSE' ? '지출' : '수입'} 카테고리를 먼저 추가해 주세요.</Text>
                ) : null}
              </View>
              <TextField label="메모" value={memo} onChangeText={setMemo} placeholder="예: 점심" />
              <TextField
                label="발생일"
                value={occurredDateInput}
                onChangeText={setOccurredDateInput}
                placeholder="YYYY-MM-DD"
              />
              <View style={styles.modalActions}>
                <PrimaryButton title={loading ? '처리 중...' : '등록'} onPress={handleAdd} disabled={loading} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={detailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDetailModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeDetailModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.detailHeader}>
              <Text style={styles.modalTitle}>
                {monthLabel} {detailModalType === 'INCOME' ? '수입' : '지출'} 상세
              </Text>
              <Pressable style={styles.addModalCloseButton} onPress={closeDetailModal}>
                <Text style={styles.addModalCloseText}>X</Text>
              </Pressable>
            </View>
            {detailItems.length === 0 ? (
              <Text style={styles.helperText}>해당 내역이 없습니다.</Text>
            ) : (
              <ScrollView style={styles.detailList} nestedScrollEnabled>
                {detailItems.map((item) => (
                  <View key={item.id} style={styles.detailRow}>
                    <View>
                      <Text style={styles.detailCategory}>
                        {categoryMap.get(item.categoryId)?.name ?? `카테고리 ${item.categoryId}`}
                      </Text>
                      <Text style={styles.detailDate}>{dayjs(item.occurredAt).format('YYYY-MM-DD')}</Text>
                      {item.memo ? <Text style={styles.detailMemo}>{item.memo}</Text> : null}
                    </View>
                    <Text style={item.type === 'INCOME' ? styles.detailIncome : styles.detailExpense}>
                      {item.type === 'INCOME' ? '+' : '-'}
                      {item.amount.toLocaleString()}원
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </Pressable>
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  expenseCard: {
    backgroundColor: '#fff',
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
  },
  monthListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  monthItemCategory: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  monthItemMemo: {
    color: '#64748b',
    fontSize: 12,
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
  categoryTotalWrap: {
    marginTop: 8,
    gap: 6,
  },
  categoryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  categoryTotalName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  categoryTotalIncome: {
    color: '#15803d',
    fontWeight: '800',
  },
  categoryTotalExpense: {
    color: '#b91c1c',
    fontWeight: '800',
  },
  inlineAddButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  inlineAddText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 12,
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
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 10,
    color: '#0f172a',
  },
  addModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addModalCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  addModalCloseText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailList: {
    maxHeight: 320,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailCategory: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  detailDate: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  detailMemo: {
    color: '#475569',
    fontSize: 12,
    marginTop: 2,
  },
  detailIncome: {
    color: '#15803d',
    fontWeight: '800',
  },
  detailExpense: {
    color: '#b91c1c',
    fontWeight: '800',
  },
  monthOption: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  monthOptionSelected: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0f172a',
  },
  monthOptionText: {
    fontSize: 17,
    color: '#0f172a',
    fontWeight: '600',
  },
  monthOptionTextSelected: {
    fontSize: 17,
    color: '#0f172a',
    fontWeight: '700',
  },
  addModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  addModalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    maxHeight: '90%',
  },
  addModalContentContainer: {
    paddingBottom: 4,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5f5',
  },
  typeChipActive: {
    borderColor: '#0f172a',
    backgroundColor: '#0f172a',
  },
  typeChipText: {
    color: '#0f172a',
  },
  typeChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  categorySection: {
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    color: '#0f172a',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5f5',
  },
  categoryChipExpense: {
    backgroundColor: 'transparent',
    borderColor: '#fecdd3',
  },
  categoryChipIncome: {
    backgroundColor: 'transparent',
    borderColor: '#bbf7d0',
  },
  categoryChipActive: {
    borderColor: '#0f172a',
    backgroundColor: '#0f172a',
  },
  categoryChipExpenseActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  categoryChipIncomeActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  categoryChipText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  modalActions: {
    gap: 8,
    marginTop: 8,
  },
});
