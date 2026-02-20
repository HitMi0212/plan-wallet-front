import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LoadingOverlay } from '../../components/LoadingOverlay';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { TransactionType } from '../../services/transactionApi';
import { useCategoryStore } from '../../stores/categoryStore';
import { useTransactionStore } from '../../stores/transactionStore';

export function TransactionFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { items, loading, add, load } = useTransactionStore();
  const categories = useCategoryStore((state) => state.items);
  const addCategory = useCategoryStore((state) => state.add);
  const loadCategories = useCategoryStore((state) => state.load);

  const initialDate = typeof route.params?.occurredDate === 'string'
    ? route.params.occurredDate
    : dayjs().format('YYYY-MM-DD');
  const initialType = route.params?.type === 'INCOME' ? 'INCOME' : 'EXPENSE';

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [occurredDateInput, setOccurredDateInput] = useState(initialDate);
  const [showOccurredDateModal, setShowOccurredDateModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [step, setStep] = useState<'INPUT' | 'CATEGORY'>('INPUT');

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
    }, [load, loadCategories])
  );

  const categoryUsageCountMap = useMemo(() => {
    const map = new Map<number, number>();
    items.forEach((item) => {
      map.set(item.categoryId, (map.get(item.categoryId) ?? 0) + 1);
    });
    return map;
  }, [items]);

  const addCategories = useMemo(
    () =>
      [...categories]
        .filter((category) => category.type === type)
        .sort((a, b) => {
          const usageDiff = (categoryUsageCountMap.get(b.id) ?? 0) - (categoryUsageCountMap.get(a.id) ?? 0);
          if (usageDiff !== 0) return usageDiff;
          return a.name.localeCompare(b.name);
        }),
    [categories, type, categoryUsageCountMap]
  );

  useEffect(() => {
    if (selectedCategoryId === null) return;
    const selected = categories.find((category) => category.id === selectedCategoryId);
    if (!selected || selected.type !== type) {
      setSelectedCategoryId(null);
    }
  }, [type, selectedCategoryId, categories]);

  const parseDateInputToIso = (value: string) => {
    const normalized = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
    const parsed = dayjs(normalized);
    if (!parsed.isValid() || parsed.format('YYYY-MM-DD') !== normalized) return null;
    return parsed.hour(12).minute(0).second(0).millisecond(0).toISOString();
  };

  const validateBaseInput = () => {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('입력 오류', '금액을 올바르게 입력해 주세요.');
      return null;
    }
    const parsedOccurredAt = parseDateInputToIso(occurredDateInput);
    if (!parsedOccurredAt) {
      Alert.alert('입력 오류', '발생일을 선택해 주세요.');
      return null;
    }
    return { parsedAmount, parsedOccurredAt };
  };

  const handleNext = () => {
    const validated = validateBaseInput();
    if (!validated) return;
    setStep('CATEGORY');
  };

  const handleAdd = async () => {
    const validated = validateBaseInput();
    if (!validated) return;
    const parsedCategory = selectedCategoryId ?? 0;
    if (!parsedCategory || parsedCategory <= 0) {
      Alert.alert('입력 오류', '카테고리를 선택해 주세요.');
      return;
    }

    await add({
      type,
      amount: validated.parsedAmount,
      categoryId: parsedCategory,
      memo: memo.trim() || null,
      occurredAt: validated.parsedOccurredAt,
    });

    navigation.goBack();
  };

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      Alert.alert('입력 오류', '카테고리 이름을 입력해 주세요.');
      return;
    }

    await addCategory({
      name: trimmed,
      type,
      expenseKind: 'NORMAL',
    });

    const created = useCategoryStore
      .getState()
      .items
      .filter((item) => item.type === type && item.name === trimmed)
      .sort((a, b) => b.id - a.id)[0];
    if (created) {
      setSelectedCategoryId(created.id);
    }
    setShowAddCategoryModal(false);
    setNewCategoryName('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{step === 'INPUT' ? '거래 등록' : '카테고리 선택'}</Text>
        <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.closeButtonText}>X</Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {step === 'INPUT' ? (
            <>
              <Text style={styles.sectionLabel}>거래 유형</Text>
              <View style={styles.typeSplitRow}>
                <Pressable
                  style={[styles.typeHalfCard, styles.typeHalfExpense, type === 'EXPENSE' && styles.typeHalfExpenseActive]}
                  onPress={() => setType('EXPENSE')}
                >
                  <Text style={[styles.typeHalfText, type === 'EXPENSE' && styles.typeHalfTextActive]}>지출</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeHalfCard, styles.typeHalfIncome, type === 'INCOME' && styles.typeHalfIncomeActive]}
                  onPress={() => setType('INCOME')}
                >
                  <Text style={[styles.typeHalfText, type === 'INCOME' && styles.typeHalfTextActive]}>수입</Text>
                </Pressable>
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateFieldLabel}>발생일</Text>
                <Pressable style={styles.dateInputButton} onPress={() => setShowOccurredDateModal(true)}>
                  <Text style={styles.dateInputText}>{occurredDateInput}</Text>
                </Pressable>
              </View>
              <TextField label="금액" value={amount} onChangeText={setAmount} placeholder="예: 12000" keyboardType="numeric" />
              <TextField
                label="비고"
                value={memo}
                onChangeText={setMemo}
                placeholder="예: 점심"
                multiline
                numberOfLines={3}
              />
            </>
          ) : (
            <>
              <View style={styles.categoryHeaderRow}>
                <Text style={styles.sectionLabel}>카테고리</Text>
                <Text style={styles.categoryHint}>많이 사용한 순</Text>
              </View>
              <View style={styles.categoryGrid}>
                {addCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    style={[
                      styles.categorySmallCard,
                      category.type === 'EXPENSE' ? styles.categorySmallExpense : styles.categorySmallIncome,
                      selectedCategoryId === category.id && styles.categorySmallCardActive,
                    ]}
                    onPress={() => setSelectedCategoryId(category.id)}
                  >
                    <Text style={selectedCategoryId === category.id ? styles.categorySmallTextActive : styles.categorySmallText}>
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  style={styles.addCategoryCard}
                  onPress={() => setShowAddCategoryModal(true)}
                >
                  <Text style={styles.addCategoryPlus}>＋</Text>
                </Pressable>
              </View>
              {addCategories.length === 0 ? (
                <Text style={styles.helperText}>{type === 'EXPENSE' ? '지출' : '수입'} 카테고리를 먼저 추가해 주세요.</Text>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>
      <View style={styles.bottomActionBar}>
        {step === 'INPUT' ? (
          <View style={styles.actionWrap}>
            <PrimaryButton title="다음" onPress={handleNext} />
          </View>
        ) : (
          <View style={styles.stepActions}>
            <View style={styles.stepActionItem}>
              <PrimaryButton title="이전" onPress={() => setStep('INPUT')} variant="secondary" />
            </View>
            <View style={styles.stepActionItem}>
              <PrimaryButton title={loading ? '처리 중...' : '등록'} onPress={handleAdd} disabled={loading} />
            </View>
          </View>
        )}
      </View>

      <Modal
        visible={showOccurredDateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOccurredDateModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowOccurredDateModal(false)}>
          <Pressable style={styles.datePickerCard} onPress={(event) => event.stopPropagation()}>
            <DateTimePicker
              value={dayjs(occurredDateInput).isValid() ? dayjs(occurredDateInput).toDate() : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, selectedDate) => {
                if (selectedDate) {
                  setOccurredDateInput(dayjs(selectedDate).format('YYYY-MM-DD'));
                  setShowOccurredDateModal(false);
                  return;
                }
                if (Platform.OS !== 'ios') {
                  setShowOccurredDateModal(false);
                }
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showAddCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddCategoryModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAddCategoryModal(false)}>
          <Pressable style={styles.inlineModalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.inlineModalTitle}>카테고리 추가</Text>
            <Text style={styles.inlineModalSub}>현재 유형: {type === 'EXPENSE' ? '지출' : '수입'}</Text>
            <TextField
              label="카테고리 이름"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="예: 커피"
            />
            <View style={styles.inlineModalActions}>
              <View style={styles.stepActionItem}>
                <PrimaryButton title="취소" onPress={() => setShowAddCategoryModal(false)} variant="secondary" />
              </View>
              <View style={styles.stepActionItem}>
                <PrimaryButton title="추가" onPress={handleCreateCategory} />
              </View>
            </View>
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
    backgroundColor: '#f8fafc',
    padding: 24,
    paddingTop: 56,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  closeButtonText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 12,
  },
  content: { paddingBottom: 8 },
  body: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  typeSplitRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  typeHalfCard: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  typeHalfExpense: {
    borderColor: '#3b82f6',
    backgroundColor: '#fff',
  },
  typeHalfIncome: {
    borderColor: '#ef4444',
    backgroundColor: '#fff',
  },
  typeHalfExpenseActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  typeHalfIncomeActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  typeHalfText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  typeHalfTextActive: {
    color: '#ffffff',
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  categoryHint: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  categorySmallCard: {
    width: '23%',
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  categorySmallExpense: {
    borderColor: '#bfdbfe',
    backgroundColor: '#fff',
  },
  categorySmallIncome: {
    borderColor: '#fecaca',
    backgroundColor: '#fff',
  },
  categorySmallCardActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  addCategoryCard: {
    width: '23%',
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderStyle: 'dashed',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCategoryPlus: {
    color: '#334155',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
  },
  categorySmallText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  categorySmallTextActive: {
    color: '#ffffff',
    fontWeight: '700',
    textAlign: 'center',
  },
  helperText: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 12,
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
    borderColor: '#c7d2fe',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#f8faff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  dateInputText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  datePickerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  inlineModalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  inlineModalTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  inlineModalSub: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  inlineModalActions: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 8,
  },
  stepActions: {
    gap: 8,
    flexDirection: 'row',
  },
  stepActionItem: {
    flex: 1,
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  actionWrap: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  bottomActionBar: {
    marginTop: 8,
    paddingTop: 12,
    paddingBottom: 18,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
});
