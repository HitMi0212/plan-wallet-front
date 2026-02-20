import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { TextField } from '../../components/TextField';
import { getLocalAssetFlowAccounts, requireAuthenticatedUserId } from '../../services/localDb';
import { Transaction, TransactionType } from '../../services/transactionApi';
import { useCategoryStore } from '../../stores/categoryStore';
import { useTransactionStore } from '../../stores/transactionStore';

const typeOptions: { label: string; value: TransactionType }[] = [
  { label: '지출', value: 'EXPENSE' },
  { label: '수입', value: 'INCOME' },
];

export function TransactionScreen({ navigation }: { navigation?: any }) {
  const { items, loading, error, load, update, remove } = useTransactionStore();
  const categories = useCategoryStore((state) => state.items);
  const loadCategories = useCategoryStore((state) => state.load);

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [selectedDate, setSelectedDate] = useState(dayjs().startOf('day'));
  const [calendarMonth, setCalendarMonth] = useState(dayjs().startOf('month'));
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailType, setDetailType] = useState<TransactionType>('EXPENSE');
  const [detailAmount, setDetailAmount] = useState('');
  const [detailMemo, setDetailMemo] = useState('');
  const [detailCategoryId, setDetailCategoryId] = useState<number | null>(null);
  const [detailOccurredDateInput, setDetailOccurredDateInput] = useState(dayjs().format('YYYY-MM-DD'));
  const [showDetailOccurredDateModal, setShowDetailOccurredDateModal] = useState(false);
  const [assetFlowManagedTransactionIds, setAssetFlowManagedTransactionIds] = useState<Set<number>>(new Set());
  const [assetFlowMemoPrefixMap, setAssetFlowMemoPrefixMap] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    load();
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
      (async () => {
        const userId = await requireAuthenticatedUserId();
        const accounts = await getLocalAssetFlowAccounts(userId);
        const ids = new Set<number>();
        const prefixMap = new Map<number, string>();
        accounts.forEach((account) => {
          const prefix = `[${account.bankName}]`;
          account.records.forEach((record) => {
            if (typeof record.transactionId === 'number') {
              ids.add(record.transactionId);
              prefixMap.set(record.transactionId, prefix);
            }
          });
        });
        setAssetFlowManagedTransactionIds(ids);
        setAssetFlowMemoPrefixMap(prefixMap);
      })();
    }, [load, loadCategories])
  );

  const sortedItems = useMemo(
    () =>
      [...items]
        .filter((item) => dayjs(item.occurredAt).format('YYYY-MM-DD') === selectedDate.format('YYYY-MM-DD'))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [items, selectedDate]
  );

  const categoryMap = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const categoryUsageCountMap = useMemo(() => {
    const map = new Map<number, number>();
    items.forEach((item) => {
      map.set(item.categoryId, (map.get(item.categoryId) ?? 0) + 1);
    });
    return map;
  }, [items]);
  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        const usageDiff = (categoryUsageCountMap.get(b.id) ?? 0) - (categoryUsageCountMap.get(a.id) ?? 0);
        if (usageDiff !== 0) return usageDiff;
        return a.name.localeCompare(b.name);
      }),
    [categories, categoryUsageCountMap]
  );
  const detailCategories = useMemo(
    () => sortedCategories.filter((category) => category.type === detailType),
    [sortedCategories, detailType]
  );
  const parseDateInputToIso = (value: string) => {
    const normalized = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
    const parsed = dayjs(normalized);
    if (!parsed.isValid() || parsed.format('YYYY-MM-DD') !== normalized) return null;
    return parsed.hour(12).minute(0).second(0).millisecond(0).toISOString();
  };

  const moveCalendarMonth = (delta: number) => {
    const next = calendarMonth.add(delta, 'month').startOf('month');
    setCalendarMonth(next);
    if (selectedDate.year() !== next.year() || selectedDate.month() !== next.month()) {
      setSelectedDate(next.startOf('day'));
    }
  };
  const moveToCurrentMonth = () => {
    const today = dayjs().startOf('day');
    setCalendarMonth(today.startOf('month'));
    setSelectedDate(today);
  };

  const calendarDays = useMemo(() => {
    const start = calendarMonth.startOf('month');
    const daysInMonth = calendarMonth.daysInMonth();
    const leadingEmpty = start.day();
    const cells: Array<dayjs.Dayjs | null> = [];

    for (let i = 0; i < leadingEmpty; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(calendarMonth.date(day));
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [calendarMonth]);
  const dayIndicators = useMemo(() => {
    const map = new Map<string, { hasIncome: boolean; hasExpense: boolean }>();
    items.forEach((item) => {
      const key = dayjs(item.occurredAt).format('YYYY-MM-DD');
      const prev = map.get(key) ?? { hasIncome: false, hasExpense: false };
      if (item.type === 'INCOME') prev.hasIncome = true;
      if (item.type === 'EXPENSE') prev.hasExpense = true;
      map.set(key, prev);
    });
    return map;
  }, [items]);

  useEffect(() => {
    if (detailCategoryId === null) return;
    const selected = categories.find((category) => category.id === detailCategoryId);
    if (!selected || selected.type !== detailType) {
      setDetailCategoryId(null);
    }
  }, [detailType, detailCategoryId, categories]);


  const openDetailModal = (item: Transaction) => {
    if (assetFlowManagedTransactionIds.has(item.id)) return;
    setSelectedTransaction(item);
    setDetailType(item.type);
    setDetailAmount(String(item.amount));
    setDetailCategoryId(item.categoryId);
    setDetailMemo(item.memo ?? '');
    setDetailOccurredDateInput(dayjs(item.occurredAt).format('YYYY-MM-DD'));
    setDetailModalVisible(true);
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedTransaction(null);
  };

  const handleSaveFromDetail = async () => {
    if (!selectedTransaction) return;
    const parsedAmount = Number(detailAmount);
    const parsedCategory = detailCategoryId ?? 0;
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('입력 오류', '금액을 올바르게 입력해 주세요.');
      return;
    }
    if (!parsedCategory || parsedCategory <= 0) {
      Alert.alert('입력 오류', '카테고리를 선택해 주세요.');
      return;
    }
    const parsedOccurredAt = parseDateInputToIso(detailOccurredDateInput);
    if (!parsedOccurredAt) {
      Alert.alert('입력 오류', '발생일은 YYYY-MM-DD 형식으로 입력해 주세요.');
      return;
    }
    await update(selectedTransaction.id, {
      type: detailType,
      amount: parsedAmount,
      categoryId: parsedCategory,
      memo: detailMemo.trim() || null,
      occurredAt: parsedOccurredAt,
    });
    closeDetailModal();
  };

  const handleDeleteFromDetail = () => {
    if (!selectedTransaction) return;
    Alert.alert('삭제 확인', '거래를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await remove(selectedTransaction.id);
          closeDetailModal();
        },
      },
    ]);
  };

  const handleDeleteFromList = (id: number) => {
    if (assetFlowManagedTransactionIds.has(id)) return;
    Alert.alert('삭제 확인', '거래를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => remove(id) },
    ]);
  };
  const getDisplayMemo = (item: Transaction) => {
    if (!item.memo) return null;
    const prefix = assetFlowMemoPrefixMap.get(item.id);
    if (!prefix) return item.memo;
    if (
      item.memo.startsWith('[예적금]') ||
      item.memo.startsWith('[투자]') ||
      item.memo.startsWith('[투자 손익]') ||
      item.memo.startsWith('예적금 ') ||
      item.memo.startsWith('투자 ')
    ) {
      return null;
    }
    return `${prefix} ${item.memo}`;
  };

  return (
    <View style={styles.container}>
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <Pressable style={styles.calendarNavButton} onPress={() => moveCalendarMonth(-1)}>
            <Text style={styles.calendarNavText}>이전</Text>
          </Pressable>
          <Pressable onPress={moveToCurrentMonth}>
            <Text style={styles.calendarMonthText}>{calendarMonth.format('YYYY년 M월')}</Text>
          </Pressable>
          <Pressable style={styles.calendarNavButton} onPress={() => moveCalendarMonth(1)}>
            <Text style={styles.calendarNavText}>다음</Text>
          </Pressable>
        </View>
        <View style={styles.weekRow}>
          {['일', '월', '화', '수', '목', '금', '토'].map((weekday) => (
            <Text key={weekday} style={styles.weekdayText}>
              {weekday}
            </Text>
          ))}
        </View>
        <View style={styles.daysGrid}>
          {calendarDays.map((date, index) => {
            if (!date) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }
            const isSelected = date.format('YYYY-MM-DD') === selectedDate.format('YYYY-MM-DD');
            const isToday = date.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
            const isHoliday = date.day() === 0;
            const indicator = dayIndicators.get(date.format('YYYY-MM-DD'));
            return (
              <Pressable
                key={date.format('YYYY-MM-DD')}
                style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                onPress={() => setSelectedDate(date.startOf('day'))}
              >
                <Text
                  style={[
                    styles.dayText,
                    isHoliday && styles.dayTextHoliday,
                    isToday && styles.dayTextToday,
                    isSelected && styles.dayTextSelected,
                  ]}
                >
                  {date.date()}
                </Text>
                <View style={styles.dotRow}>
                  {indicator?.hasIncome ? <View style={[styles.dot, styles.dotIncome]} /> : null}
                  {indicator?.hasExpense ? <View style={[styles.dot, styles.dotExpense]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.listHeader}>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.refreshButton}
            onPress={() => {
              navigation?.navigate?.('TransactionForm', {
                occurredDate: selectedDate.format('YYYY-MM-DD'),
                type,
              });
            }}
          >
            <Text style={styles.refreshText}>추가</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<EmptyState title="선택한 날짜의 거래가 없습니다." description="달력에서 날짜를 바꾸거나 새 거래를 추가해 보세요." />}
        renderItem={({ item }) => {
          const displayMemo = getDisplayMemo(item);
          return (
            <View style={styles.listItem}>
              <Pressable style={styles.itemContent} onPress={() => openDetailModal(item)}>
                <Text style={styles.itemNameBase}>
                  {categoryMap.get(item.categoryId)?.name ?? `카테고리 ${item.categoryId}`}{' '}
                  <Text style={item.type === 'EXPENSE' ? styles.itemAmountExpense : styles.itemAmountIncome}>
                    {item.amount.toLocaleString()}원
                  </Text>
                </Text>
                <Text style={styles.itemMeta}>
                  {dayjs(item.occurredAt).format('YYYY-MM-DD')}
                </Text>
                {displayMemo ? <Text style={styles.itemMemo}>{displayMemo}</Text> : null}
              </Pressable>
              {!assetFlowManagedTransactionIds.has(item.id) ? (
                <Pressable
                  style={[styles.actionButton, styles.deleteButton, styles.inlineDeleteButton]}
                  onPress={() => handleDeleteFromList(item.id)}
                >
                  <Text style={[styles.actionText, styles.deleteActionText]}>삭제</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />

      <Modal visible={detailModalVisible} transparent animationType="fade" onRequestClose={closeDetailModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeDetailModal}>
          <Pressable style={styles.detailModalCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.detailTitle}>거래 상세</Text>
              <Pressable style={styles.closeButton} onPress={closeDetailModal}>
                <Text style={styles.closeButtonText}>X</Text>
              </Pressable>
            </View>
            {selectedTransaction ? (
              <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={styles.detailRows}>
                  <View style={styles.typeRow}>
                    {typeOptions.map((option) => (
                      <Pressable
                        key={option.value}
                        style={[styles.typeChip, detailType === option.value && styles.typeChipActive]}
                        onPress={() => setDetailType(option.value)}
                      >
                        <Text
                          style={detailType === option.value ? styles.typeChipTextActive : styles.typeChipText}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextField label="금액" value={detailAmount} onChangeText={setDetailAmount} placeholder="예: 12000" keyboardType="numeric" />
                  <View style={styles.categorySection}>
                    <Text style={styles.categoryLabel}>카테고리</Text>
                    <View style={styles.categoryRow}>
                      {detailCategories.map((category) => (
                        <Pressable
                          key={category.id}
                          style={[
                            styles.categoryChip,
                            category.type === 'EXPENSE' ? styles.categoryChipExpense : styles.categoryChipIncome,
                            category.type === 'EXPENSE' && detailCategoryId === category.id ? styles.categoryChipExpenseActive : null,
                            category.type === 'INCOME' && detailCategoryId === category.id ? styles.categoryChipIncomeActive : null,
                            detailCategoryId === category.id && styles.categoryChipActive,
                          ]}
                          onPress={() => setDetailCategoryId(category.id)}
                        >
                          <Text
                            style={detailCategoryId === category.id ? styles.categoryChipTextActive : styles.categoryChipText}
                          >
                            {category.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {detailCategories.length === 0 ? (
                      <Text style={styles.helperText}>{detailType === 'EXPENSE' ? '지출' : '수입'} 카테고리를 먼저 추가해 주세요.</Text>
                    ) : null}
                  </View>
                  <TextField
                    label="비고"
                    value={detailMemo}
                    onChangeText={setDetailMemo}
                    placeholder="예: 점심"
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.dateField}>
                    <Text style={styles.dateFieldLabel}>발생일</Text>
                    <Pressable style={styles.dateInputButton} onPress={() => setShowDetailOccurredDateModal(true)}>
                      <Text style={styles.dateInputText}>{detailOccurredDateInput}</Text>
                    </Pressable>
                  </View>
                  <View style={styles.detailActions}>
                    <Pressable style={[styles.actionButton, styles.detailActionButton]} onPress={handleSaveFromDetail}>
                      <Text style={[styles.actionText, styles.detailActionText]}>저장</Text>
                    </Pressable>
                    <Pressable style={[styles.actionButton, styles.deleteButton, styles.detailActionButton]} onPress={handleDeleteFromDetail}>
                      <Text style={[styles.actionText, styles.deleteActionText, styles.detailActionText]}>삭제</Text>
                    </Pressable>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showDetailOccurredDateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetailOccurredDateModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowDetailOccurredDateModal(false)}>
          <Pressable style={styles.datePickerCard} onPress={(event) => event.stopPropagation()}>
            <DateTimePicker
              value={dayjs(detailOccurredDateInput).isValid() ? dayjs(detailOccurredDateInput).toDate() : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, selectedDate) => {
                if (selectedDate) {
                  setDetailOccurredDateInput(dayjs(selectedDate).format('YYYY-MM-DD'));
                  setShowDetailOccurredDateModal(false);
                  return;
                }
                if (Platform.OS !== 'ios') {
                  setShowDetailOccurredDateModal(false);
                }
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {loading ? <LoadingOverlay /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
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
    borderColor: '#bfdbfe',
  },
  categoryChipIncome: {
    backgroundColor: 'transparent',
    borderColor: '#fecaca',
  },
  categoryChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  categoryChipExpenseActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryChipIncomeActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  categoryChipText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  helperText: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 12,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5f5',
  },
  typeChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  typeChipText: {
    color: '#0f172a',
  },
  typeChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: 'transparent',
  },
  refreshText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  list: {
    paddingBottom: 40,
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarNavButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5f5',
  },
  calendarNavText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarMonthText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayText: {
    width: '14.285%',
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 8,
    paddingTop: 6,
  },
  dayCellSelected: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  dayText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  dayTextHoliday: {
    color: '#dc2626',
  },
  dayTextToday: {
    color: '#2563eb',
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#1d4ed8',
    fontSize: 15,
    fontWeight: '700',
  },
  dotRow: {
    marginTop: 2,
    flexDirection: 'row',
    gap: 3,
    height: 6,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  dotIncome: {
    backgroundColor: '#dc2626',
  },
  dotExpense: {
    backgroundColor: '#2563eb',
  },
  listItem: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    paddingRight: 10,
  },
  itemNameBase: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: '#0f172a',
  },
  itemAmountIncome: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
  },
  itemAmountExpense: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
  itemMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  itemMemo: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  deleteButton: {
    borderColor: '#ef4444',
  },
  inlineDeleteButton: {
    marginLeft: 8,
  },
  actionText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteActionText: {
    color: '#dc2626',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    maxHeight: '90%',
  },
  modalContentContainer: {
    paddingBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  closeButtonText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 12,
  },
  modalActions: {
    gap: 8,
    marginTop: 8,
  },
  dateField: {
    marginBottom: 12,
  },
  dateFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    color: '#0f172a',
  },
  dateInputButton: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#fff',
  },
  dateInputText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  datePickerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  detailModalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  detailTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  detailRows: {
    gap: 8,
    marginTop: 8,
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  detailActionButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  detailActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
