import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
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

import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import {
  addLocalAssetFlowRecord,
  AssetFlowAccount,
  AssetFlowRecord,
  AssetFlowType,
  createLocalAssetFlowAccount,
  deleteLocalAssetFlowAccount,
  deleteLocalAssetFlowRecord,
  getLocalAssetFlowAccounts,
  requireAuthenticatedUserId,
  syncLocalAssetFlowToTransactions,
  updateLocalAssetFlowAccount,
  updateLocalAssetFlowRecord,
} from '../../services/localDb';
import { useCategoryStore } from '../../stores/categoryStore';
import { useTransactionStore } from '../../stores/transactionStore';

const typeOptions: { label: string; value: AssetFlowType }[] = [
  { label: '예적금', value: 'SAVINGS' },
  { label: '투자', value: 'INVEST' },
];

export function AssetFlowScreen() {
  const loadTransactions = useTransactionStore((state) => state.load);
  const loadCategories = useCategoryStore((state) => state.load);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AssetFlowAccount[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [addAccountModalVisible, setAddAccountModalVisible] = useState(false);
  const [editAccountModalVisible, setEditAccountModalVisible] = useState(false);
  const [addRecordModalVisible, setAddRecordModalVisible] = useState(false);
  const [recordTargetId, setRecordTargetId] = useState<number | null>(null);
  const [recordEditId, setRecordEditId] = useState<number | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);

  const [type, setType] = useState<AssetFlowType>('SAVINGS');
  const [bankName, setBankName] = useState('');
  const [productName, setProductName] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [occurredAt, setOccurredAt] = useState(dayjs().toISOString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const occurredDate = dayjs(occurredAt).toDate();

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const userId = await requireAuthenticatedUserId();
      await syncLocalAssetFlowToTransactions(userId);
      const items = await getLocalAssetFlowAccounts(userId);
      setAccounts(items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const totals = useMemo(() => {
    return accounts.reduce(
      (acc, account) => {
        const total = account.records.reduce((sum, record) => sum + record.amount, 0);
        if (account.type === 'SAVINGS') acc.savings += total;
        if (account.type === 'INVEST') acc.invest += total;
        return acc;
      },
      { savings: 0, invest: 0 }
    );
  }, [accounts]);

  const resetForm = () => {
    setType('SAVINGS');
    setBankName('');
    setProductName('');
    setAmount('');
    setMemo('');
    setOccurredAt(dayjs().toISOString());
    setShowDatePicker(false);
  };

  const handleCreateAccount = async () => {
    const parsedAmount = Number(amount);
    if (!bankName.trim() || !productName.trim()) {
      Alert.alert('입력 오류', '은행명과 상품명을 입력해 주세요.');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('입력 오류', '금액을 올바르게 입력해 주세요.');
      return;
    }

    const userId = await requireAuthenticatedUserId();
    await createLocalAssetFlowAccount(userId, {
      type,
      bankName: bankName.trim(),
      productName: productName.trim(),
      amount: parsedAmount,
      occurredAt,
      memo: memo.trim() || null,
    });

    setAddAccountModalVisible(false);
    resetForm();
    await loadAccounts();
    await Promise.all([loadTransactions(), loadCategories()]);
  };

  const handleAddOrUpdateRecord = async () => {
    if (recordTargetId === null) return;
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('입력 오류', '금액을 올바르게 입력해 주세요.');
      return;
    }
    const userId = await requireAuthenticatedUserId();
    if (recordEditId === null) {
      await addLocalAssetFlowRecord(userId, recordTargetId, {
        amount: parsedAmount,
        occurredAt,
        memo: memo.trim() || null,
      });
    } else {
      await updateLocalAssetFlowRecord(userId, recordTargetId, recordEditId, {
        amount: parsedAmount,
        occurredAt,
        memo: memo.trim() || null,
      });
    }

    setAddRecordModalVisible(false);
    setRecordTargetId(null);
    setRecordEditId(null);
    setAmount('');
    setMemo('');
    setOccurredAt(dayjs().toISOString());
    setShowDatePicker(false);
    await loadAccounts();
    await Promise.all([loadTransactions(), loadCategories()]);
  };

  const openAddRecordModal = (accountId: number) => {
    setRecordTargetId(accountId);
    setRecordEditId(null);
    setAmount('');
    setMemo('');
    setOccurredAt(dayjs().toISOString());
    setShowDatePicker(false);
    setAddRecordModalVisible(true);
  };

  const openEditRecordModal = (accountId: number, record: AssetFlowRecord) => {
    setRecordTargetId(accountId);
    setRecordEditId(record.id);
    setAmount(String(record.amount));
    setMemo(record.memo ?? '');
    setOccurredAt(record.occurredAt);
    setShowDatePicker(false);
    setAddRecordModalVisible(true);
  };

  const handleDeleteRecord = async (accountId: number, recordId: number) => {
    Alert.alert('삭제 확인', '입금 내역을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const userId = await requireAuthenticatedUserId();
          await deleteLocalAssetFlowRecord(userId, accountId, recordId);
          await loadAccounts();
          await Promise.all([loadTransactions(), loadCategories()]);
        },
      },
    ]);
  };

  const openEditAccountModal = (account: AssetFlowAccount) => {
    setEditingAccountId(account.id);
    setType(account.type);
    setBankName(account.bankName);
    setProductName(account.productName);
    setEditAccountModalVisible(true);
  };

  const handleUpdateAccount = async () => {
    if (editingAccountId === null) return;
    if (!bankName.trim() || !productName.trim()) {
      Alert.alert('입력 오류', '은행명과 상품명을 입력해 주세요.');
      return;
    }
    const userId = await requireAuthenticatedUserId();
    await updateLocalAssetFlowAccount(userId, editingAccountId, {
      type,
      bankName,
      productName,
    });
    setEditAccountModalVisible(false);
    setEditingAccountId(null);
    await loadAccounts();
    await Promise.all([loadTransactions(), loadCategories()]);
  };

  const handleDeleteAccount = async (accountId: number) => {
    Alert.alert('삭제 확인', '상품과 모든 입금 내역을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const userId = await requireAuthenticatedUserId();
          await deleteLocalAssetFlowAccount(userId, accountId);
          if (expandedId === accountId) setExpandedId(null);
          await loadAccounts();
          await Promise.all([loadTransactions(), loadCategories()]);
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.topRow}>
        <Text style={styles.summaryTitle}>예적금/투자 총합</Text>
        <Pressable
          style={styles.quickAddButton}
          onPress={() => {
            resetForm();
            setAddAccountModalVisible(true);
          }}
        >
          <Text style={styles.quickAddText}>새 상품 추가</Text>
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.savingsText}>예적금 {totals.savings.toLocaleString()}원</Text>
        <Text style={styles.investText}>투자 {totals.invest.toLocaleString()}원</Text>
      </View>

      {accounts.length === 0 ? (
        <EmptyState
          title="예적금/투자 내역이 없습니다."
          description="새 상품 추가로 은행/상품을 등록해 보세요."
        />
      ) : (
        accounts.map((account) => {
          const total = account.records.reduce((sum, record) => sum + record.amount, 0);
          const isExpanded = expandedId === account.id;
          const records = [...account.records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
          return (
            <Pressable
              key={account.id}
              style={styles.item}
              onPress={() => {
                setExpandedId((prev) => (prev === account.id ? null : account.id));
              }}
            >
              <View style={styles.itemTop}>
                <View>
                  <Text style={styles.itemTitle}>
                    {account.bankName} · {account.productName}
                  </Text>
                  <Text style={styles.itemMeta}>{account.type === 'SAVINGS' ? '예적금' : '투자'}</Text>
                </View>
                <Text style={account.type === 'SAVINGS' ? styles.itemAmountSavings : styles.itemAmountInvest}>
                  {total.toLocaleString()}원
                </Text>
              </View>

              {isExpanded ? (
                <View style={styles.expandArea}>
                  <View style={styles.accountActionRow}>
                    <Pressable style={[styles.accountActionButton, styles.accountEditButton]} onPress={() => openEditAccountModal(account)}>
                      <Text style={styles.accountActionText}>상품 수정</Text>
                    </Pressable>
                <Pressable style={[styles.accountActionButton, styles.accountDeleteButton]} onPress={() => handleDeleteAccount(account.id)}>
                  <Text style={[styles.accountActionText, styles.accountDeleteText]}>상품 삭제</Text>
                </Pressable>
              </View>
                  <Pressable style={styles.addRecordButton} onPress={() => openAddRecordModal(account.id)}>
                    <Text style={styles.addRecordButtonText}>입금 내역 추가</Text>
                  </Pressable>
                  {records.map((record) => (
                    <View key={record.id} style={styles.recordRow}>
                      <View>
                        <Text style={styles.recordDate}>{dayjs(record.occurredAt).format('YYYY-MM-DD')}</Text>
                        {record.memo ? <Text style={styles.recordMemo}>{record.memo}</Text> : null}
                      </View>
                      <View style={styles.recordRight}>
                        <Text style={styles.recordAmount}>{record.amount.toLocaleString()}원</Text>
                        <View style={styles.recordActions}>
                          <Pressable
                            style={[styles.smallButton, styles.editButton]}
                            onPress={() => openEditRecordModal(account.id, record)}
                          >
                            <Text style={styles.smallButtonText}>수정</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.smallButton, styles.deleteButton]}
                            onPress={() => handleDeleteRecord(account.id, record.id)}
                          >
                            <Text style={[styles.smallButtonText, styles.smallDeleteButtonText]}>삭제</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </Pressable>
          );
        })
      )}

      {loading ? <Text style={styles.loadingText}>불러오는 중...</Text> : null}

      <Modal visible={addAccountModalVisible} transparent animationType="slide" onRequestClose={() => setAddAccountModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView contentContainerStyle={styles.modalContentContainer}>
              <Text style={styles.modalTitle}>새 상품 추가</Text>
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
              <TextField label="은행" value={bankName} onChangeText={setBankName} placeholder="예: 신한은행" />
              <TextField label="상품명" value={productName} onChangeText={setProductName} placeholder="예: 청년희망적금" />
              <TextField label="금액" value={amount} onChangeText={setAmount} placeholder="예: 500000" />
              <TextField label="비고" value={memo} onChangeText={setMemo} placeholder="선택 입력" />
              <View style={styles.dateField}>
                <Text style={styles.dateFieldLabel}>날짜</Text>
                <Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.dateButtonText}>{dayjs(occurredAt).format('YYYY-MM-DD')}</Text>
                </Pressable>
              </View>
              {showDatePicker ? (
                <DateTimePicker
                  value={occurredDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, selectedDate) => {
                    if (selectedDate) {
                      setOccurredAt(dayjs(selectedDate).toISOString());
                    }
                    if (Platform.OS !== 'ios') {
                      setShowDatePicker(false);
                    }
                  }}
                />
              ) : null}
              <View style={styles.modalActions}>
                <PrimaryButton title="등록" onPress={handleCreateAccount} variant="primary" />
                <PrimaryButton title="취소" onPress={() => setAddAccountModalVisible(false)} variant="secondary" />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editAccountModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditAccountModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView contentContainerStyle={styles.modalContentContainer}>
              <Text style={styles.modalTitle}>상품 수정</Text>
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
              <TextField label="은행" value={bankName} onChangeText={setBankName} placeholder="예: 신한은행" />
              <TextField label="상품명" value={productName} onChangeText={setProductName} placeholder="예: 청년희망적금" />
              <View style={styles.modalActions}>
                <PrimaryButton title="저장" onPress={handleUpdateAccount} variant="primary" />
                <PrimaryButton
                  title="취소"
                  variant="secondary"
                  onPress={() => {
                    setEditAccountModalVisible(false);
                    setEditingAccountId(null);
                    resetForm();
                  }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={addRecordModalVisible} transparent animationType="slide" onRequestClose={() => setAddRecordModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView contentContainerStyle={styles.modalContentContainer}>
              <Text style={styles.modalTitle}>{recordEditId === null ? '입금 내역 추가' : '입금 내역 수정'}</Text>
              <TextField label="금액" value={amount} onChangeText={setAmount} placeholder="예: 200000" />
              <TextField label="비고" value={memo} onChangeText={setMemo} placeholder="선택 입력" />
              <View style={styles.dateField}>
                <Text style={styles.dateFieldLabel}>날짜</Text>
                <Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.dateButtonText}>{dayjs(occurredAt).format('YYYY-MM-DD')}</Text>
                </Pressable>
              </View>
              {showDatePicker ? (
                <DateTimePicker
                  value={occurredDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, selectedDate) => {
                    if (selectedDate) {
                      setOccurredAt(dayjs(selectedDate).toISOString());
                    }
                    if (Platform.OS !== 'ios') {
                      setShowDatePicker(false);
                    }
                  }}
                />
              ) : null}
              <View style={styles.modalActions}>
                <PrimaryButton title={recordEditId === null ? '추가' : '저장'} onPress={handleAddOrUpdateRecord} variant="primary" />
                <PrimaryButton
                  title="취소"
                  variant="secondary"
                  onPress={() => {
                    setAddRecordModalVisible(false);
                    setRecordTargetId(null);
                    setRecordEditId(null);
                  }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
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
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  quickAddButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickAddText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
  item: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  itemTop: {
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
  expandArea: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    gap: 8,
  },
  accountActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  accountActionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  accountEditButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  accountDeleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  accountActionText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  accountDeleteText: {
    color: '#dc2626',
  },
  addRecordButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addRecordButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '700',
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  recordDate: {
    color: '#475569',
    fontSize: 13,
  },
  recordAmount: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  recordMemo: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  recordRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  recordActions: {
    flexDirection: 'row',
    gap: 6,
  },
  smallButton: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  smallButtonText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
  },
  smallDeleteButtonText: {
    color: '#dc2626',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    color: '#0f172a',
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
    backgroundColor: 'transparent',
  },
  dateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  modalActions: {
    gap: 8,
    marginTop: 8,
  },
});
