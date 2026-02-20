import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
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
import { fetchUsdKrwRate } from '../../services/exchangeRateApi';
import {
  AssetFlowAccount,
  AssetFlowCurrency,
  AssetFlowType,
  createLocalAssetFlowAccount,
  getLocalAssetFlowAccounts,
  requireAuthenticatedUserId,
  syncLocalAssetFlowToTransactions,
} from '../../services/localDb';
import { useCategoryStore } from '../../stores/categoryStore';
import { useTransactionStore } from '../../stores/transactionStore';

const typeOptions: { label: string; value: AssetFlowType }[] = [
  { label: '예적금', value: 'SAVINGS' },
  { label: '투자', value: 'INVEST' },
];
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

export function AssetFlowScreen({ navigation }: { navigation: any }) {
  const loadTransactions = useTransactionStore((state) => state.load);
  const loadCategories = useCategoryStore((state) => state.load);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AssetFlowAccount[]>([]);
  const [usdKrwRate, setUsdKrwRate] = useState<number | null>(null);
  const [addAccountModalVisible, setAddAccountModalVisible] = useState(false);

  const [type, setType] = useState<AssetFlowType>('SAVINGS');
  const [currency, setCurrency] = useState<AssetFlowCurrency>('KRW');
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

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
      loadTransactions();
      loadCategories();
      fetchUsdKrwRate()
        .then((rate) => setUsdKrwRate(rate))
        .catch(() => setUsdKrwRate(null));
    }, [loadAccounts, loadTransactions, loadCategories])
  );

  const totals = useMemo(() => {
    return accounts.reduce(
      (acc, account) => {
        const total = account.records.reduce((sum, record) => sum + record.amount, 0);
        if (account.type === 'SAVINGS') acc.savings += total;
        if (account.type === 'INVEST') {
          const accountCurrency = account.currency ?? 'KRW';
          if (accountCurrency === 'USD') {
            acc.investUsd += total;
          } else {
            acc.investKrw += total;
          }
        }
        return acc;
      },
      { savings: 0, investKrw: 0, investUsd: 0 }
    );
  }, [accounts]);

  const resetForm = () => {
    setType('SAVINGS');
    setCurrency('KRW');
    setBankName('');
    setProductName('');
    setAmount('');
    setMemo('');
    setOccurredAt(dayjs().toISOString());
    setShowDatePicker(false);
  };

  const handleCreateAccount = async () => {
    const parsedAmount = Number(amount);
    if (!bankName.trim()) {
      Alert.alert('입력 오류', type === 'SAVINGS' ? '은행을 입력해 주세요.' : '증권사를 입력해 주세요.');
      return;
    }
    if (type === 'SAVINGS' && !productName.trim()) {
      Alert.alert('입력 오류', '상품명을 입력해 주세요.');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('입력 오류', '금액을 올바르게 입력해 주세요.');
      return;
    }
    if (type === 'INVEST' && currency === 'USD' && (!usdKrwRate || usdKrwRate <= 0)) {
      Alert.alert('환율 오류', '환율 정보를 불러온 뒤 다시 시도해 주세요.');
      return;
    }

    const userId = await requireAuthenticatedUserId();
    await createLocalAssetFlowAccount(userId, {
      type,
      currency: type === 'INVEST' ? currency : 'KRW',
      bankName: bankName.trim(),
      productName: type === 'SAVINGS' ? productName.trim() : '',
      amount: parsedAmount,
      fxRate: type === 'INVEST' && currency === 'USD' ? usdKrwRate ?? undefined : undefined,
      occurredAt,
      memo: memo.trim() || null,
    });

    setAddAccountModalVisible(false);
    resetForm();
    await loadAccounts();
    await Promise.all([loadTransactions(), loadCategories()]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.summaryCard}>
        <Text style={styles.savingsText}>예적금 {totals.savings.toLocaleString()}원</Text>
        <Text style={styles.investText}>
          투자 총합{' '}
          {(
            totals.investKrw +
            (usdKrwRate ? Math.trunc(totals.investUsd * usdKrwRate) : 0)
          ).toLocaleString()}
          원
        </Text>
        {usdKrwRate ? (
          <Text style={styles.rateText}>
            적용 환율: 1 USD = {usdKrwRate.toLocaleString()}원 (한국수출입은행)
          </Text>
        ) : null}
        {!usdKrwRate && totals.investUsd > 0 ? (
          <Text style={styles.rateText}>USD 투자 금액 환산을 위해 환율을 불러오는 중입니다.</Text>
        ) : null}
      </View>

      <View style={styles.quickAddRow}>
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

      {accounts.length === 0 ? (
        <EmptyState
          title="예적금/투자 내역이 없습니다."
          description="새 상품 추가로 은행/증권사를 등록해 보세요."
        />
      ) : (
        accounts.map((account) => {
          const total = account.records.reduce((sum, record) => sum + record.amount, 0);
          return (
            <Pressable
              key={account.id}
              style={styles.item}
              onPress={() => navigation.navigate('AssetFlowDetail', { accountId: account.id })}
            >
              <View style={styles.itemTop}>
                <View>
                  <Text style={styles.itemTitle}>
                    {account.type === 'SAVINGS'
                      ? `${account.bankName} · ${account.productName}`
                      : `${account.bankName}`}
                  </Text>
                  <Text style={styles.itemMeta}>{account.type === 'SAVINGS' ? '예적금' : '투자'}</Text>
                  {account.type === 'INVEST' ? (
                    <Text style={styles.itemMeta}>화폐: {account.currency ?? 'KRW'}</Text>
                  ) : null}
                </View>
                <Text style={account.type === 'SAVINGS' ? styles.itemAmountSavings : styles.itemAmountInvest}>
                  {formatCurrencyAmount(total, account.type === 'SAVINGS' ? 'KRW' : account.currency ?? 'KRW')}
                </Text>
              </View>
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
              <TextField
                label={type === 'SAVINGS' ? '은행' : '증권사'}
                value={bankName}
                onChangeText={setBankName}
                placeholder={type === 'SAVINGS' ? '예: 신한은행' : '예: 미래에셋증권'}
              />
              {type === 'SAVINGS' ? (
                <TextField label="상품명" value={productName} onChangeText={setProductName} placeholder="예: 청년희망적금" />
              ) : null}
              {type === 'INVEST' ? (
                <View style={styles.typeRow}>
                  {currencyOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[styles.typeChip, currency === option.value && styles.typeChipActive]}
                      onPress={() => setCurrency(option.value)}
                    >
                      <Text style={currency === option.value ? styles.typeChipTextActive : styles.typeChipText}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <TextField label="초기 금액" value={amount} onChangeText={setAmount} placeholder="예: 500000" />
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
  quickAddRow: {
    alignItems: 'flex-end',
    marginTop: -4,
    marginBottom: 12,
  },
  quickAddButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  quickAddText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 14,
    gap: 4,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  savingsText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  investText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  rateText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  itemMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  itemAmountSavings: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 16,
  },
  itemAmountInvest: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 16,
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
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  modalContentContainer: {
    paddingBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
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
