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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{step === 'INPUT' ? '거래 등록' : '카테고리 선택'}</Text>
        <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.closeButtonText}>X</Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.content}>
          {step === 'INPUT' ? (
            <>
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
            <View style={styles.categorySection}>
              <Text style={styles.categoryLabel}>카테고리</Text>
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
              </View>
              {addCategories.length === 0 ? (
                <Text style={styles.helperText}>{type === 'EXPENSE' ? '지출' : '수입'} 카테고리를 먼저 추가해 주세요.</Text>
              ) : null}
            </View>
          )}
        </ScrollView>
      </View>
      <View style={styles.bottomActionBar}>
        {step === 'INPUT' ? (
          <PrimaryButton title="다음" onPress={handleNext} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
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
  },
  closeButtonText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 12,
  },
  content: {
    paddingBottom: 12,
  },
  body: {
    flex: 1,
  },
  typeSplitRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  typeHalfCard: {
    flex: 1,
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 20,
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
    gap: 6,
  },
  categorySmallCard: {
    width: '23.5%',
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
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
  stepActions: {
    gap: 8,
    flexDirection: 'row',
  },
  stepActionItem: {
    flex: 1,
  },
  bottomActionBar: {
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
});
