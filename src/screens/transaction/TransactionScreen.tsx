import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { TransactionType } from '../../services/transactionApi';
import { useCategoryStore } from '../../stores/categoryStore';
import { useTransactionStore } from '../../stores/transactionStore';

const typeOptions: { label: string; value: TransactionType }[] = [
  { label: '지출', value: 'EXPENSE' },
  { label: '수입', value: 'INCOME' },
];

export function TransactionScreen() {
  const { items, loading, error, load, add, update, remove } = useTransactionStore();
  const categories = useCategoryStore((state) => state.items);
  const loadCategories = useCategoryStore((state) => state.load);

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [occurredAt, setOccurredAt] = useState(dayjs().toISOString());
  const [showOccurredDatePicker, setShowOccurredDatePicker] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs().startOf('day'));
  const [calendarMonth, setCalendarMonth] = useState(dayjs().startOf('month'));

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingAmount, setEditingAmount] = useState('');
  const [editingMemo, setEditingMemo] = useState('');
  const [editingOccurredAt, setEditingOccurredAt] = useState('');
  const [showEditingOccurredDatePicker, setShowEditingOccurredDatePicker] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<TransactionType>('EXPENSE');

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (categories.length === 0) {
      loadCategories();
    }
  }, [categories.length, loadCategories]);

  const sortedItems = useMemo(
    () =>
      [...items]
        .filter((item) => dayjs(item.occurredAt).format('YYYY-MM-DD') === selectedDate.format('YYYY-MM-DD'))
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [items, selectedDate]
  );

  const categoryMap = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );
  const addCategories = useMemo(
    () => sortedCategories.filter((category) => category.type === type),
    [sortedCategories, type]
  );
  const editCategories = useMemo(
    () => sortedCategories.filter((category) => category.type === editingType),
    [sortedCategories, editingType]
  );

  const occurredDate = dayjs(occurredAt).isValid() ? dayjs(occurredAt).toDate() : new Date();
  const editingOccurredDate = dayjs(editingOccurredAt).isValid()
    ? dayjs(editingOccurredAt).toDate()
    : new Date();

  const resetAddForm = (baseDate: dayjs.Dayjs = selectedDate) => {
    setType('EXPENSE');
    setAmount('');
    setSelectedCategoryId(null);
    setMemo('');
    setOccurredAt(baseDate.hour(12).minute(0).second(0).millisecond(0).toISOString());
    setShowOccurredDatePicker(false);
  };

  const moveCalendarMonth = (delta: number) => {
    const next = calendarMonth.add(delta, 'month').startOf('month');
    setCalendarMonth(next);
    if (selectedDate.year() !== next.year() || selectedDate.month() !== next.month()) {
      setSelectedDate(next.startOf('day'));
    }
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
    if (selectedCategoryId === null) return;
    const selected = categories.find((category) => category.id === selectedCategoryId);
    if (!selected || selected.type !== type) {
      setSelectedCategoryId(null);
    }
  }, [type, selectedCategoryId, categories]);

  useEffect(() => {
    if (editingCategoryId === null) return;
    const selected = categories.find((category) => category.id === editingCategoryId);
    if (!selected || selected.type !== editingType) {
      setEditingCategoryId(null);
    }
  }, [editingType, editingCategoryId, categories]);

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

    await add({
      type,
      amount: parsedAmount,
      categoryId: parsedCategory,
      memo: memo.trim() || null,
      occurredAt,
    });

    setAddModalVisible(false);
    resetAddForm();
  };

  const startEdit = (id: number) => {
    const target = items.find((item) => item.id === id);
    if (!target) return;
    setEditingId(id);
    setEditingType(target.type);
    setEditingAmount(String(target.amount));
    setEditingCategoryId(target.categoryId);
    setEditingMemo(target.memo ?? '');
    setEditingOccurredAt(target.occurredAt);
    setShowEditingOccurredDatePicker(false);
  };

  const handleUpdate = async () => {
    if (editingId === null) return;

    const parsedAmount = Number(editingAmount);
    const parsedCategory = editingCategoryId ?? 0;
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('입력 오류', '금액을 올바르게 입력해 주세요.');
      return;
    }
    if (!parsedCategory || parsedCategory <= 0) {
      Alert.alert('입력 오류', '카테고리를 선택해 주세요.');
      return;
    }

    await update(editingId, {
      type: editingType,
      amount: parsedAmount,
      categoryId: parsedCategory,
      memo: editingMemo.trim() || null,
      occurredAt: editingOccurredAt,
    });

    setEditingId(null);
    setShowEditingOccurredDatePicker(false);
  };

  const handleDelete = (id: number) => {
    Alert.alert('삭제 확인', '거래를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => remove(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <Pressable style={styles.calendarNavButton} onPress={() => moveCalendarMonth(-1)}>
            <Text style={styles.calendarNavText}>이전</Text>
          </Pressable>
          <Text style={styles.calendarMonthText}>{calendarMonth.format('YYYY년 M월')}</Text>
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
            const isHoliday = date.day() === 0 || date.day() === 6;
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
              resetAddForm();
              setAddModalVisible(true);
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
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<EmptyState title="선택한 날짜의 거래가 없습니다." description="달력에서 날짜를 바꾸거나 새 거래를 추가해 보세요." />}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            {editingId === item.id ? (
              <View style={styles.editBox}>
                <View style={styles.typeRow}>
                  {typeOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[styles.typeChip, editingType === option.value && styles.typeChipActive]}
                      onPress={() => setEditingType(option.value)}
                    >
                      <Text style={editingType === option.value ? styles.typeChipTextActive : styles.typeChipText}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput style={styles.editInput} value={editingAmount} onChangeText={setEditingAmount} />
                <View style={styles.categoryRow}>
                  {editCategories.map((category) => (
                    <Pressable
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        category.type === 'EXPENSE' ? styles.categoryChipExpense : styles.categoryChipIncome,
                        editingCategoryId === category.id && styles.categoryChipActive,
                      ]}
                      onPress={() => setEditingCategoryId(category.id)}
                    >
                      <Text
                        style={
                          editingCategoryId === category.id
                            ? styles.categoryChipTextActive
                            : styles.categoryChipText
                        }
                      >
                        {category.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {editCategories.length === 0 ? (
                  <Text style={styles.helperText}>
                    {editingType === 'EXPENSE' ? '지출' : '수입'} 카테고리를 먼저 추가해 주세요.
                  </Text>
                ) : null}
                <TextInput style={styles.editInput} value={editingMemo} onChangeText={setEditingMemo} />
                <Pressable style={styles.dateButton} onPress={() => setShowEditingOccurredDatePicker(true)}>
                  <Text style={styles.dateButtonText}>{dayjs(editingOccurredAt).format('YYYY-MM-DD')}</Text>
                </Pressable>
                {showEditingOccurredDatePicker ? (
                  <DateTimePicker
                    value={editingOccurredDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={(_, selectedDate) => {
                      if (selectedDate) {
                        setEditingOccurredAt(dayjs(selectedDate).toISOString());
                      }
                      if (Platform.OS !== 'ios') {
                        setShowEditingOccurredDatePicker(false);
                      }
                    }}
                  />
                ) : null}
                <View style={styles.actions}>
                  <Pressable style={styles.actionButton} onPress={handleUpdate}>
                    <Text style={styles.actionText}>저장</Text>
                  </Pressable>
                  <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={() => setEditingId(null)}>
                    <Text style={styles.actionText}>취소</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <View>
                  <Text style={item.type === 'EXPENSE' ? styles.itemNameExpense : styles.itemNameIncome}>
                    {categoryMap.get(item.categoryId)?.name ?? `카테고리 ${item.categoryId}`}{' '}
                    {item.amount.toLocaleString()}원
                  </Text>
                  <Text style={styles.itemMeta}>
                    {dayjs(item.occurredAt).format('YYYY-MM-DD')}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Pressable style={styles.actionButton} onPress={() => startEdit(item.id)}>
                    <Text style={styles.actionText}>수정</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Text style={styles.actionText}>삭제</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}
      />

      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView contentContainerStyle={styles.modalContentContainer}>
              <View style={styles.modalHeader}>
                <View />
                <Pressable style={styles.closeButton} onPress={() => setAddModalVisible(false)}>
                  <Text style={styles.closeButtonText}>X</Text>
                </Pressable>
              </View>
              <View style={styles.typeRow}>
                {typeOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[styles.typeChip, type === option.value && styles.typeChipActive]}
                    onPress={() => setType(option.value)}
                  >
                    <Text style={type === option.value ? styles.typeChipTextActive : styles.typeChipText}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
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
              <TextField label="비고" value={memo} onChangeText={setMemo} placeholder="예: 점심" />
              <View style={styles.dateField}>
                <Text style={styles.dateFieldLabel}>발생일</Text>
                <Pressable style={styles.dateButton} onPress={() => setShowOccurredDatePicker(true)}>
                  <Text style={styles.dateButtonText}>{dayjs(occurredAt).format('YYYY-MM-DD')}</Text>
                </Pressable>
              </View>
              {showOccurredDatePicker ? (
                <DateTimePicker
                  value={occurredDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, selectedDate) => {
                    if (selectedDate) {
                      setOccurredAt(dayjs(selectedDate).toISOString());
                    }
                    if (Platform.OS !== 'ios') {
                      setShowOccurredDatePicker(false);
                    }
                  }}
                />
              ) : null}

              <View style={styles.modalActions}>
                <PrimaryButton title={loading ? '처리 중...' : '등록'} onPress={handleAdd} disabled={loading} />
              </View>
            </ScrollView>
          </View>
        </View>
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
  dateField: {
    marginBottom: 12,
  },
  dateFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    color: '#0f172a',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 15,
    fontWeight: '600',
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
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  categoryChipIncome: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
  },
  categoryChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  categoryChipText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#fff',
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
    color: '#fff',
    fontWeight: '600',
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
    backgroundColor: '#16a34a',
  },
  dotExpense: {
    backgroundColor: '#dc2626',
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
  itemNameIncome: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: '#15803d',
  },
  itemNameExpense: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: '#b91c1c',
  },
  itemMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  cancelButton: {
    backgroundColor: '#94a3b8',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  editBox: {
    flex: 1,
    gap: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
});
