import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import dayjs from 'dayjs';

import {
  createLocalRecurringRule,
  deleteLocalRecurringRule,
  getLocalCategories,
  getLocalRecurringRules,
  requireAuthenticatedUserId,
  updateLocalRecurringRule,
  RecurringRule,
  RecurringFrequency,
} from '../../services/localDb';
import { Category } from '../../services/categoryApi';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';

function formatFrequency(value: RecurringRule['frequency']) {
  if (value === 'WEEKLY') return '매주';
  if (value === 'MONTHLY') return '매월';
  return '매년';
}

function resolveDayOfMonth(rule: RecurringRule, date: dayjs.Dayjs) {
  const base = rule.dayOfMonth ?? dayjs(rule.startDate, 'YYYY-MM-DD').date();
  return Math.min(base, date.daysInMonth());
}

function matchesRuleOn(rule: RecurringRule, date: dayjs.Dayjs) {
  if (rule.frequency === 'WEEKLY') {
    const dayOfWeek = rule.dayOfWeek ?? dayjs(rule.startDate, 'YYYY-MM-DD').day();
    return date.day() === dayOfWeek;
  }
  if (rule.frequency === 'MONTHLY') {
    return date.date() === resolveDayOfMonth(rule, date);
  }
  const monthOfYear = rule.monthOfYear ?? dayjs(rule.startDate, 'YYYY-MM-DD').month() + 1;
  if (date.month() + 1 !== monthOfYear) return false;
  return date.date() === resolveDayOfMonth(rule, date);
}

function getNextOccurrence(rule: RecurringRule) {
  const start = dayjs(rule.startDate, 'YYYY-MM-DD').startOf('day');
  const end = rule.endDate ? dayjs(rule.endDate, 'YYYY-MM-DD').endOf('day') : null;
  const last = rule.lastGeneratedAt ? dayjs(rule.lastGeneratedAt, 'YYYY-MM-DD').startOf('day') : null;
  let cursor = last ? last.add(1, 'day') : start;
  const limit = dayjs().add(2, 'year');
  while (cursor.isBefore(limit) || cursor.isSame(limit, 'day')) {
    if (cursor.isAfter(start) || cursor.isSame(start, 'day')) {
      if (!end || cursor.isBefore(end) || cursor.isSame(end, 'day')) {
        if (matchesRuleOn(rule, cursor)) {
          return cursor.format('YYYY-MM-DD');
        }
      }
    }
    cursor = cursor.add(1, 'day');
  }
  return null;
}

export function RecurringManagementScreen() {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryMap, setCategoryMap] = useState<Map<number, string>>(new Map());
  const [categories, setCategories] = useState<Category[]>([]);
  const [editRule, setEditRule] = useState<RecurringRule | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMemo, setEditMemo] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addType, setAddType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [addAmount, setAddAmount] = useState('');
  const [addCategoryId, setAddCategoryId] = useState<number | null>(null);
  const [addMemo, setAddMemo] = useState('');
  const [addFrequency, setAddFrequency] = useState<RecurringFrequency>('MONTHLY');
  const [addStartDate, setAddStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [addEndDate, setAddEndDate] = useState('');
  const [addPaymentMethod, setAddPaymentMethod] = useState<'CREDIT' | 'DEBIT' | 'CASH'>('CASH');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const userId = await requireAuthenticatedUserId();
      const [nextRules, categories] = await Promise.all([
        getLocalRecurringRules(userId),
        getLocalCategories(userId),
      ]);
      setRules(nextRules);
      setCategories(categories);
      setCategoryMap(new Map(categories.map((category) => [category.id, category.name])));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!addCategoryId) return;
    const selected = categories.find((category) => category.id === addCategoryId);
    if (!selected || selected.type !== addType) {
      setAddCategoryId(null);
    }
  }, [addType, addCategoryId, categories]);

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [rules]
  );

  const handleToggle = async (rule: RecurringRule) => {
    const userId = await requireAuthenticatedUserId();
    const next = await updateLocalRecurringRule(userId, rule.id, { isActive: !rule.isActive });
    setRules((prev) => prev.map((item) => (item.id === next.id ? next : item)));
  };

  const handleDelete = (rule: RecurringRule) => {
    Alert.alert('삭제 확인', '반복 거래를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const userId = await requireAuthenticatedUserId();
          await deleteLocalRecurringRule(userId, rule.id);
          setRules((prev) => prev.filter((item) => item.id !== rule.id));
        },
      },
    ]);
  };

  const openEditModal = (rule: RecurringRule) => {
    setEditRule(rule);
    setEditAmount(String(rule.amount));
    setEditMemo(rule.memo ?? '');
    setEditEndDate(rule.endDate ?? '');
    setEditActive(rule.isActive);
  };

  const closeEditModal = () => {
    setEditRule(null);
    setEditAmount('');
    setEditMemo('');
    setEditEndDate('');
    setEditActive(true);
  };

  const handleSaveEdit = async () => {
    if (!editRule) return;
    const parsedAmount = Number(editAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('입력 오류', '금액을 올바르게 입력해 주세요.');
      return;
    }
    const normalizedEnd = editEndDate.trim();
    if (normalizedEnd && !dayjs(normalizedEnd, 'YYYY-MM-DD', true).isValid()) {
      Alert.alert('입력 오류', '종료일은 YYYY-MM-DD 형식이어야 합니다.');
      return;
    }
    const userId = await requireAuthenticatedUserId();
    const updated = await updateLocalRecurringRule(userId, editRule.id, {
      amount: parsedAmount,
      memo: editMemo.trim() || null,
      endDate: normalizedEnd || null,
      isActive: editActive,
    });
    setRules((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    closeEditModal();
  };

  const openAddModal = () => {
    setAddType('EXPENSE');
    setAddAmount('');
    setAddCategoryId(null);
    setAddMemo('');
    setAddFrequency('MONTHLY');
    setAddStartDate(dayjs().format('YYYY-MM-DD'));
    setAddEndDate('');
    setAddPaymentMethod('CASH');
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
  };

  const handleCreateRule = async () => {
    const parsedAmount = Number(addAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('입력 오류', '금액을 올바르게 입력해 주세요.');
      return;
    }
    if (!addCategoryId) {
      Alert.alert('입력 오류', '카테고리를 선택해 주세요.');
      return;
    }
    if (!dayjs(addStartDate, 'YYYY-MM-DD', true).isValid()) {
      Alert.alert('입력 오류', '시작일은 YYYY-MM-DD 형식이어야 합니다.');
      return;
    }
    if (addEndDate && !dayjs(addEndDate, 'YYYY-MM-DD', true).isValid()) {
      Alert.alert('입력 오류', '종료일은 YYYY-MM-DD 형식이어야 합니다.');
      return;
    }
    const baseDate = dayjs(addStartDate, 'YYYY-MM-DD');
    const userId = await requireAuthenticatedUserId();
    const created = await createLocalRecurringRule(userId, {
      type: addType,
      amount: parsedAmount,
      categoryId: addCategoryId,
      paymentMethod: addType === 'EXPENSE' ? addPaymentMethod : null,
      memo: addMemo.trim() || null,
      startDate: addStartDate,
      endDate: addEndDate.trim() || null,
      frequency: addFrequency,
      dayOfWeek: addFrequency === 'WEEKLY' ? baseDate.day() : undefined,
      dayOfMonth: addFrequency === 'MONTHLY' || addFrequency === 'YEARLY' ? baseDate.date() : undefined,
      monthOfYear: addFrequency === 'YEARLY' ? baseDate.month() + 1 : undefined,
    });
    setRules((prev) => [...prev, created]);
    closeAddModal();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>반복 거래 관리</Text>
        <Text style={styles.helperText}>거래 등록 시 설정한 반복 항목을 관리합니다.</Text>
        <PrimaryButton title="새 반복 거래 추가" onPress={openAddModal} variant="primary" />
      </View>

      {sortedRules.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>등록된 반복 거래가 없습니다.</Text>
        </View>
      ) : (
        sortedRules.map((rule) => (
          <View key={rule.id} style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <View>
                <Text style={styles.ruleTitle}>
                  {rule.type === 'EXPENSE' ? '지출' : '수입'} · {formatFrequency(rule.frequency)}
                </Text>
                <Text style={styles.ruleAmount}>{rule.amount.toLocaleString()}원</Text>
              </View>
              <Pressable
                style={[styles.toggleButton, rule.isActive && styles.toggleButtonActive]}
                onPress={() => handleToggle(rule)}
              >
                <Text style={rule.isActive ? styles.toggleTextActive : styles.toggleText}>
                  {rule.isActive ? '활성' : '비활성'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.ruleMeta}>카테고리: {categoryMap.get(rule.categoryId) ?? `카테고리 ${rule.categoryId}`}</Text>
            <Text style={styles.ruleMeta}>시작일: {rule.startDate}</Text>
            {rule.endDate ? <Text style={styles.ruleMeta}>종료일: {rule.endDate}</Text> : null}
            {rule.lastGeneratedAt ? (
              <Text style={styles.ruleMeta}>마지막 생성: {rule.lastGeneratedAt}</Text>
            ) : null}
            {(() => {
              const nextDate = getNextOccurrence(rule);
              return nextDate ? <Text style={styles.ruleMeta}>다음 생성: {nextDate}</Text> : null;
            })()}
            {rule.memo ? <Text style={styles.ruleMemo}>메모: {rule.memo}</Text> : null}
            <View style={styles.ruleActions}>
              <PrimaryButton title="수정" onPress={() => openEditModal(rule)} variant="secondary" />
              <PrimaryButton title="삭제" onPress={() => handleDelete(rule)} variant="danger" />
            </View>
          </View>
        ))
      )}

      {loading ? <Text style={styles.helperText}>불러오는 중...</Text> : null}

      <Modal visible={Boolean(editRule)} transparent animationType="fade" onRequestClose={closeEditModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeEditModal}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>반복 거래 수정</Text>
            {editRule ? (
              <>
                <TextField
                  label="금액"
                  value={editAmount}
                  onChangeText={setEditAmount}
                  placeholder="예: 120000"
                  keyboardType="numeric"
                />
                <TextField
                  label="메모"
                  value={editMemo}
                  onChangeText={setEditMemo}
                  placeholder="선택 입력"
                />
                <TextField
                  label="종료일(선택)"
                  value={editEndDate}
                  onChangeText={setEditEndDate}
                  placeholder="YYYY-MM-DD"
                />
                <View style={styles.editToggleRow}>
                  <Text style={styles.editToggleLabel}>상태</Text>
                  <Pressable
                    style={[styles.toggleButton, editActive && styles.toggleButtonActive]}
                    onPress={() => setEditActive((prev) => !prev)}
                  >
                    <Text style={editActive ? styles.toggleTextActive : styles.toggleText}>
                      {editActive ? '활성' : '비활성'}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.modalActions}>
                  <View style={styles.modalActionItem}>
                    <PrimaryButton title="취소" onPress={closeEditModal} variant="secondary" />
                  </View>
                  <View style={styles.modalActionItem}>
                    <PrimaryButton title="저장" onPress={handleSaveEdit} variant="primary" />
                  </View>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={addModalOpen} transparent animationType="fade" onRequestClose={closeAddModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeAddModal}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>반복 거래 추가</Text>
            <View style={styles.segmentRow}>
              {(['EXPENSE', 'INCOME'] as const).map((value) => (
                <Pressable
                  key={value}
                  style={[styles.segmentChip, addType === value && styles.segmentChipActive]}
                  onPress={() => setAddType(value)}
                >
                  <Text style={addType === value ? styles.segmentTextActive : styles.segmentText}>
                    {value === 'EXPENSE' ? '지출' : '수입'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextField
              label="금액"
              value={addAmount}
              onChangeText={setAddAmount}
              placeholder="예: 120000"
              keyboardType="numeric"
            />
            <View style={styles.segmentRow}>
              {(['WEEKLY', 'MONTHLY', 'YEARLY'] as const).map((value) => (
                <Pressable
                  key={value}
                  style={[styles.segmentChip, addFrequency === value && styles.segmentChipActive]}
                  onPress={() => setAddFrequency(value)}
                >
                  <Text style={addFrequency === value ? styles.segmentTextActive : styles.segmentText}>
                    {formatFrequency(value)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextField
              label="시작일"
              value={addStartDate}
              onChangeText={setAddStartDate}
              placeholder="YYYY-MM-DD"
            />
            <TextField
              label="종료일(선택)"
              value={addEndDate}
              onChangeText={setAddEndDate}
              placeholder="YYYY-MM-DD"
            />
            {addType === 'EXPENSE' ? (
              <View style={styles.segmentRow}>
                {(['CREDIT', 'DEBIT', 'CASH'] as const).map((value) => (
                  <Pressable
                    key={value}
                    style={[styles.segmentChip, addPaymentMethod === value && styles.segmentChipActive]}
                    onPress={() => setAddPaymentMethod(value)}
                  >
                    <Text style={addPaymentMethod === value ? styles.segmentTextActive : styles.segmentText}>
                      {value === 'CREDIT' ? '신용카드' : value === 'DEBIT' ? '체크카드' : '현금'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Text style={styles.subLabel}>카테고리</Text>
            <View style={styles.categoryWrap}>
              {categories
                .filter((category) => category.type === addType)
                .map((category) => (
                  <Pressable
                    key={category.id}
                    style={[styles.categoryChip, addCategoryId === category.id && styles.categoryChipActive]}
                    onPress={() => setAddCategoryId(category.id)}
                  >
                    <Text style={addCategoryId === category.id ? styles.categoryChipTextActive : styles.categoryChipText}>
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
            </View>
            <TextField
              label="메모"
              value={addMemo}
              onChangeText={setAddMemo}
              placeholder="선택 입력"
            />
            <View style={styles.modalActions}>
              <View style={styles.modalActionItem}>
                <PrimaryButton title="취소" onPress={closeAddModal} variant="secondary" />
              </View>
              <View style={styles.modalActionItem}>
                <PrimaryButton title="추가" onPress={handleCreateRule} variant="primary" />
              </View>
            </View>
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
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  helperText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  ruleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 6,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  ruleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  ruleAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  ruleMeta: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  ruleMemo: {
    fontSize: 12,
    color: '#64748b',
  },
  ruleActions: {
    marginTop: 6,
    gap: 8,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  segmentChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5f5',
  },
  segmentChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  segmentText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5f5',
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
    color: '#ffffff',
    fontWeight: '700',
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
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  modalActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  modalActionItem: {
    flex: 1,
  },
  editToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  editToggleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  toggleButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  toggleButtonActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  toggleText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 12,
  },
  toggleTextActive: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
});
