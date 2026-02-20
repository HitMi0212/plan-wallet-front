import dayjs from 'dayjs';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
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

import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { RootStackParamList } from '../../app/routes';
import { fetchUsdKrwRate } from '../../services/exchangeRateApi';
import {
  addLocalAssetFlowRecord,
  AssetFlowAccount,
  AssetFlowCurrency,
  AssetFlowRecord,
  AssetFlowRecordKind,
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

type Props = NativeStackScreenProps<RootStackParamList, 'AssetFlowDetail'>;

function recordKindLabel(kind?: AssetFlowRecordKind) {
  return kind === 'PNL' ? '손익' : '입금';
}

type RecordEntryType = 'DEPOSIT' | 'PROFIT' | 'LOSS';

const currencyOptions: { label: string; value: AssetFlowCurrency }[] = [
  { label: '원화 (KRW)', value: 'KRW' },
  { label: '달러 (USD)', value: 'USD' },
];

function formatCurrencyAmount(amount: number, currency: AssetFlowCurrency) {
  const abs = Math.abs(amount).toLocaleString();
  if (currency === 'USD') {
    return `${amount < 0 ? '-' : ''}$${abs}`;
  }
  return `${amount < 0 ? '-' : ''}${abs}원`;
}

export function AssetFlowDetailScreen({ navigation, route }: Props) {
  const { accountId } = route.params;
  const loadTransactions = useTransactionStore((state) => state.load);
  const loadCategories = useCategoryStore((state) => state.load);

  const [loading, setLoading] = useState(false);
  const [usdKrwRate, setUsdKrwRate] = useState<number | null>(null);
  const [account, setAccount] = useState<AssetFlowAccount | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [recordEditId, setRecordEditId] = useState<number | null>(null);
  const [recordEntryType, setRecordEntryType] = useState<RecordEntryType>('DEPOSIT');
  const [currency, setCurrency] = useState<AssetFlowCurrency>('KRW');
  const [bankName, setBankName] = useState('');
  const [productName, setProductName] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [occurredAt, setOccurredAt] = useState(dayjs().toISOString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const occurredDate = dayjs(occurredAt).toDate();

  const loadAccount = useCallback(async () => {
    setLoading(true);
    try {
      const userId = await requireAuthenticatedUserId();
      await syncLocalAssetFlowToTransactions(userId);
      const items = await getLocalAssetFlowAccounts(userId);
      const found = items.find((item) => item.id === accountId) ?? null;
      setAccount(found);
      if (!found) {
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  }, [accountId, navigation]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  useFocusEffect(
    useCallback(() => {
      loadAccount();
      loadTransactions();
      loadCategories();
      fetchUsdKrwRate()
        .then((rate) => setUsdKrwRate(rate))
        .catch(() => setUsdKrwRate(null));
    }, [loadAccount, loadTransactions, loadCategories])
  );

  useLayoutEffect(() => {
    if (!account) return;
    navigation.setOptions({
      title: account.type === 'SAVINGS' ? `${account.bankName} ${account.productName}` : `${account.bankName}`,
    });
  }, [account, navigation]);

  const totalAmount = useMemo(() => {
    if (!account) return 0;
    return account.records.reduce((sum, record) => sum + record.amount, 0);
  }, [account]);

  const sortedRecords = useMemo(() => {
    if (!account) return [];
    return [...account.records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [account]);

  const openEditAccountModal = () => {
    if (!account) return;
    setBankName(account.bankName);
    setProductName(account.productName);
    setCurrency(account.currency ?? 'KRW');
    setEditModalVisible(true);
  };

  const handleUpdateAccount = async () => {
    if (!account) return;
    const institution = bankName.trim();
    if (!institution) {
      Alert.alert('입력 오류', account.type === 'SAVINGS' ? '은행을 입력해 주세요.' : '증권사를 입력해 주세요.');
      return;
    }
    if (account.type === 'SAVINGS' && !productName.trim()) {
      Alert.alert('입력 오류', '상품명을 입력해 주세요.');
      return;
    }

    const userId = await requireAuthenticatedUserId();
    await updateLocalAssetFlowAccount(userId, account.id, {
      type: account.type,
      currency: account.type === 'INVEST' ? currency : 'KRW',
      bankName: institution,
      productName: account.type === 'SAVINGS' ? productName.trim() : '',
    });
    setEditModalVisible(false);
    await loadAccount();
    await Promise.all([loadTransactions(), loadCategories()]);
  };

  const handleDeleteAccount = () => {
    if (!account) return;
    Alert.alert('삭제 확인', '상품과 모든 내역을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const userId = await requireAuthenticatedUserId();
          await deleteLocalAssetFlowAccount(userId, account.id);
          await Promise.all([loadTransactions(), loadCategories()]);
          navigation.goBack();
        },
      },
    ]);
  };

  const openAddRecordModal = () => {
    setRecordEditId(null);
    setRecordEntryType('DEPOSIT');
    setAmount('');
    setMemo('');
    setOccurredAt(dayjs().toISOString());
    setShowDatePicker(false);
    setRecordModalVisible(true);
  };

  const openEditRecordModal = (record: AssetFlowRecord) => {
    setRecordEditId(record.id);
    if ((record.kind ?? 'DEPOSIT') === 'PNL') {
      setRecordEntryType(record.amount >= 0 ? 'PROFIT' : 'LOSS');
      setAmount(String(Math.abs(record.amount)));
    } else {
      setRecordEntryType('DEPOSIT');
      setAmount(String(record.amount));
    }
    setMemo(record.memo ?? '');
    setOccurredAt(record.occurredAt);
    setShowDatePicker(false);
    setRecordModalVisible(true);
  };

  const handleSaveRecord = async () => {
    if (!account) return;
    const parsedAmount = Number(amount);
    if (recordEntryType === 'DEPOSIT') {
      if (!parsedAmount || parsedAmount <= 0) {
        Alert.alert('입력 오류', '입금 금액은 0보다 커야 합니다.');
        return;
      }
    } else if (!parsedAmount || parsedAmount === 0) {
      Alert.alert('입력 오류', '손익 금액은 0이 될 수 없습니다.');
      return;
    }
    const normalizedAmount =
      recordEntryType === 'LOSS'
        ? -Math.abs(parsedAmount)
        : Math.abs(parsedAmount);
    const normalizedKind: AssetFlowRecordKind = recordEntryType === 'DEPOSIT' ? 'DEPOSIT' : 'PNL';

    const userId = await requireAuthenticatedUserId();
    if (recordEditId === null) {
      await addLocalAssetFlowRecord(userId, account.id, {
        kind: normalizedKind,
        amount: normalizedAmount,
        occurredAt,
        memo: memo.trim() || null,
      });
    } else {
      await updateLocalAssetFlowRecord(userId, account.id, recordEditId, {
        kind: normalizedKind,
        amount: normalizedAmount,
        occurredAt,
        memo: memo.trim() || null,
      });
    }
    setRecordModalVisible(false);
    await loadAccount();
    await Promise.all([loadTransactions(), loadCategories()]);
  };

  const handleDeleteRecord = async () => {
    if (!account) return;
    if (recordEditId === null) return;
    const target = account.records.find((item) => item.id === recordEditId);
    if (!target) return;

    Alert.alert('삭제 확인', `${recordKindLabel(target.kind)} 내역을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const userId = await requireAuthenticatedUserId();
          await deleteLocalAssetFlowRecord(userId, account.id, target.id);
          setRecordModalVisible(false);
          setRecordEditId(null);
          await loadAccount();
          await Promise.all([loadTransactions(), loadCategories()]);
        },
      },
    ]);
  };

  if (!account) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.helperText}>상품을 불러오는 중입니다.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerCard}>
        <View style={styles.headerActionRowCompact}>
          <Pressable style={[styles.headerActionCompact, styles.headerEditCompact]} onPress={openEditAccountModal}>
            <Text style={styles.headerActionCompactText}>수정</Text>
          </Pressable>
          <Pressable style={[styles.headerActionCompact, styles.headerDeleteCompact]} onPress={handleDeleteAccount}>
            <Text style={styles.headerDeleteCompactText}>삭제</Text>
          </Pressable>
        </View>
        <Text style={styles.headerType}>{account.type === 'SAVINGS' ? '예적금' : '투자'}</Text>
        <Text style={styles.headerName}>
          {account.type === 'SAVINGS' ? `${account.bankName} · ${account.productName}` : account.bankName}
        </Text>
        <Text style={styles.headerAmount}>
          {formatCurrencyAmount(totalAmount, account.type === 'SAVINGS' ? 'KRW' : account.currency ?? 'KRW')}
        </Text>
        {account.type === 'INVEST' && account.currency === 'USD' && usdKrwRate ? (
          <Text style={styles.rateText}>
            약 {(totalAmount * usdKrwRate).toLocaleString()}원 (1 USD = {usdKrwRate.toLocaleString()}원)
          </Text>
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.addRecordButton} onPress={openAddRecordModal}>
          <Text style={styles.addRecordButtonText}>내역 추가</Text>
        </Pressable>
      </View>

      <View style={styles.listWrap}>
        {sortedRecords.length === 0 ? (
          <Text style={styles.helperText}>등록된 내역이 없습니다.</Text>
        ) : (
          sortedRecords.map((record) => {
            const kind = record.kind ?? 'DEPOSIT';
            return (
              <View key={record.id} style={styles.recordRow}>
                <Pressable style={styles.recordMain} onPress={() => openEditRecordModal(record)}>
                  <Text style={styles.recordDate}>{dayjs(record.occurredAt).format('YYYY-MM-DD')}</Text>
                  <Text style={styles.recordKind}>{recordKindLabel(kind)}</Text>
                  {record.memo ? <Text style={styles.recordMemo}>{record.memo}</Text> : null}
                </Pressable>
                <View style={styles.recordRight}>
                  <Text
                    style={[
                      styles.recordAmount,
                      kind === 'PNL' && record.amount > 0 ? styles.recordPnlPlus : null,
                      kind === 'PNL' && record.amount < 0 ? styles.recordPnlMinus : null,
                    ]}
                  >
                    {kind === 'PNL' && record.amount > 0 ? '+' : ''}
                    {formatCurrencyAmount(record.amount, account.type === 'SAVINGS' ? 'KRW' : account.currency ?? 'KRW')}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView contentContainerStyle={styles.modalContentContainer}>
              <Pressable style={styles.modalCloseButton} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCloseText}>X</Text>
              </Pressable>
              <Text style={styles.modalTitle}>상품 수정</Text>
              <TextField
                label={account.type === 'SAVINGS' ? '은행' : '증권사'}
                value={bankName}
                onChangeText={setBankName}
                placeholder={account.type === 'SAVINGS' ? '예: 신한은행' : '예: 미래에셋증권'}
              />
              {account.type === 'SAVINGS' ? (
                <TextField label="상품명" value={productName} onChangeText={setProductName} placeholder="예: 청년희망적금" />
              ) : null}
              {account.type === 'INVEST' ? (
                <View style={styles.radioRow}>
                  {currencyOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[styles.radioChip, currency === option.value && styles.radioChipActive]}
                      onPress={() => setCurrency(option.value)}
                    >
                      <Text style={currency === option.value ? styles.radioChipTextActive : styles.radioChipText}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <View style={styles.modalActions}>
                <PrimaryButton title="저장" onPress={handleUpdateAccount} variant="primary" />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={recordModalVisible} transparent animationType="slide" onRequestClose={() => setRecordModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView contentContainerStyle={styles.modalContentContainer}>
              <Pressable style={styles.modalCloseButton} onPress={() => setRecordModalVisible(false)}>
                <Text style={styles.modalCloseText}>X</Text>
              </Pressable>
              <Text style={styles.modalTitle}>내역 {recordEditId ? '수정' : '추가'}</Text>
              <View style={styles.radioRow}>
                <Pressable
                  style={[styles.radioChip, recordEntryType === 'DEPOSIT' && styles.radioChipActive]}
                  onPress={() => setRecordEntryType('DEPOSIT')}
                >
                  <Text style={recordEntryType === 'DEPOSIT' ? styles.radioChipTextActive : styles.radioChipText}>입금</Text>
                </Pressable>
                <Pressable
                  style={[styles.radioChip, recordEntryType === 'PROFIT' && styles.radioChipActive]}
                  onPress={() => setRecordEntryType('PROFIT')}
                >
                  <Text style={recordEntryType === 'PROFIT' ? styles.radioChipTextActive : styles.radioChipText}>수익</Text>
                </Pressable>
                <Pressable
                  style={[styles.radioChip, recordEntryType === 'LOSS' && styles.radioChipActive]}
                  onPress={() => setRecordEntryType('LOSS')}
                >
                  <Text style={recordEntryType === 'LOSS' ? styles.radioChipTextActive : styles.radioChipText}>손실</Text>
                </Pressable>
              </View>
              <TextField
                label={`${recordEntryType === 'DEPOSIT' ? '입금 금액' : '손익 금액'} (${account.type === 'INVEST' ? account.currency ?? 'KRW' : 'KRW'})`}
                value={amount}
                onChangeText={setAmount}
                placeholder={recordEntryType === 'DEPOSIT' ? '예: 300000' : '예: 120000'}
              />
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
                <PrimaryButton title={recordEditId ? '저장' : '등록'} onPress={handleSaveRecord} variant="primary" />
                {recordEditId ? (
                  <PrimaryButton title="삭제" onPress={handleDeleteRecord} variant="danger" />
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {loading ? <Text style={styles.loadingText}>불러오는 중...</Text> : null}
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
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 4,
    position: 'relative',
    paddingRight: 94,
  },
  headerActionRowCompact: {
    flexDirection: 'row',
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 6,
  },
  headerActionCompact: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  headerEditCompact: {
    borderColor: '#1e293b',
  },
  headerDeleteCompact: {
    borderColor: '#ef4444',
  },
  headerActionCompactText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerDeleteCompactText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  headerType: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  headerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  rateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addRecordButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flex: 1,
    alignItems: 'center',
  },
  addRecordButtonText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
  },
  listWrap: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 10,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  recordMain: {
    flex: 1,
  },
  recordDate: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
  },
  recordKind: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  recordMemo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  recordRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  recordPnlPlus: {
    color: '#15803d',
  },
  recordPnlMinus: {
    color: '#b91c1c',
  },
  helperText: {
    fontSize: 13,
    color: '#64748b',
  },
  radioRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  radioChip: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  radioChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  radioChipText: {
    color: '#0f172a',
  },
  radioChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  emptyWrap: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
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
  modalCloseButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  modalActions: {
    gap: 8,
    marginTop: 8,
  },
  dateField: {
    gap: 6,
    marginBottom: 8,
  },
  dateFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    color: '#0f172a',
    fontSize: 14,
  },
});
