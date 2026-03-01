import dayjs from 'dayjs';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
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
  if (kind === 'PNL') return '손익';
  if (kind === 'WITHDRAW') return '인출';
  if (kind === 'INTEREST') return '이자';
  return '입금';
}

type RecordEntryType = 'DEPOSIT' | 'PROFIT' | 'LOSS' | 'WITHDRAW' | 'INTEREST';

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
  const [recordInputCurrency, setRecordInputCurrency] = useState<AssetFlowCurrency>('KRW');
  const [bankName, setBankName] = useState('');
  const [productName, setProductName] = useState('');
  const [interestType, setInterestType] = useState<'SIMPLE' | 'COMPOUND'>('SIMPLE');
  const [interestRateInput, setInterestRateInput] = useState('');
  const [maturityDateInput, setMaturityDateInput] = useState('');
  const [showMaturityDatePicker, setShowMaturityDatePicker] = useState(false);
  const [interestCalcModalOpen, setInterestCalcModalOpen] = useState(false);
  const [interestPrincipal, setInterestPrincipal] = useState('');
  const [interestStartDate, setInterestStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [interestEndDate, setInterestEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [interestAmount, setInterestAmount] = useState<number | null>(null);
  const [showInterestStartPicker, setShowInterestStartPicker] = useState(false);
  const [showInterestEndPicker, setShowInterestEndPicker] = useState(false);
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

  useEffect(() => {
    if (!account) return;
    setInterestType(account.interestType ?? 'SIMPLE');
    setInterestRateInput(account.interestRate ? String(account.interestRate) : '');
    setMaturityDateInput(account.maturityDate ?? '');
  }, [account]);

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

  const getRecordNetAmount = React.useCallback((record: AssetFlowRecord) => {
    const kind = record.kind ?? 'DEPOSIT';
    if (kind === 'WITHDRAW') return -Math.abs(record.amount);
    if (kind === 'INTEREST') return Math.abs(record.amount);
    return record.amount;
  }, []);

  const totalAmount = useMemo(() => {
    if (!account) return 0;
    return account.records.reduce((sum, record) => sum + getRecordNetAmount(record), 0);
  }, [account, getRecordNetAmount]);

  const sortedRecords = useMemo(() => {
    if (!account) return [];
    return [...account.records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [account]);

  const openEditAccountModal = () => {
    if (!account) return;
    setBankName(account.bankName);
    setProductName(account.productName);
    setCurrency(account.currency ?? 'KRW');
    setInterestType(account.interestType ?? 'SIMPLE');
    setInterestRateInput(account.interestRate ? String(account.interestRate) : '');
    setMaturityDateInput(account.maturityDate ?? '');
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

    const parsedRate = interestRateInput.trim() === '' ? null : Number(interestRateInput);
    if (parsedRate !== null && (!Number.isFinite(parsedRate) || parsedRate <= 0)) {
      Alert.alert('입력 오류', '이율은 0보다 큰 숫자여야 합니다.');
      return;
    }
    const normalizedMaturity = maturityDateInput.trim() || null;
    if (normalizedMaturity && !dayjs(normalizedMaturity, 'YYYY-MM-DD', true).isValid()) {
      Alert.alert('입력 오류', '만기일은 YYYY-MM-DD 형식이어야 합니다.');
      return;
    }

    const userId = await requireAuthenticatedUserId();
    await updateLocalAssetFlowAccount(userId, account.id, {
      type: account.type,
      currency: account.type === 'INVEST' ? currency : 'KRW',
      bankName: institution,
      productName: account.type === 'SAVINGS' ? productName.trim() : '',
      interestType,
      interestRate: parsedRate,
      maturityDate: normalizedMaturity,
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
    setRecordInputCurrency(account?.type === 'INVEST' ? account.currency ?? 'KRW' : 'KRW');
    setAmount('');
    setMemo('');
    setOccurredAt(dayjs().toISOString());
    setShowDatePicker(false);
    setRecordModalVisible(true);
  };

  const openWithdrawModal = () => {
    setRecordEditId(null);
    setRecordEntryType('WITHDRAW');
    setRecordInputCurrency(account?.type === 'INVEST' ? account.currency ?? 'KRW' : 'KRW');
    setAmount(String(Math.max(Math.abs(totalAmount), 0)));
    setMemo('만기 인출');
    setOccurredAt(dayjs().toISOString());
    setShowDatePicker(false);
    setRecordModalVisible(true);
  };

  const openEditRecordModal = (record: AssetFlowRecord) => {
    setRecordEditId(record.id);
    setRecordInputCurrency(account?.type === 'INVEST' ? account.currency ?? 'KRW' : 'KRW');
    const kind = record.kind ?? 'DEPOSIT';
    if (kind === 'PNL') {
      setRecordEntryType(record.amount >= 0 ? 'PROFIT' : 'LOSS');
      setAmount(String(Math.abs(record.amount)));
    } else if (kind === 'WITHDRAW') {
      setRecordEntryType('WITHDRAW');
      setAmount(String(Math.abs(record.amount)));
    } else if (kind === 'INTEREST') {
      setRecordEntryType('INTEREST');
      setAmount(String(Math.abs(record.amount)));
    } else {
      setRecordEntryType('DEPOSIT');
      setAmount(String(Math.abs(record.amount)));
    }
    setMemo(record.memo ?? '');
    setOccurredAt(record.occurredAt);
    setShowDatePicker(false);
    setRecordModalVisible(true);
  };

  const handleSaveRecord = async () => {
    if (!account) return;
    const parsedAmount = Number(amount);
    if (recordEntryType === 'DEPOSIT' || recordEntryType === 'WITHDRAW' || recordEntryType === 'INTEREST') {
      if (!parsedAmount || parsedAmount <= 0) {
        Alert.alert('입력 오류', '금액은 0보다 커야 합니다.');
        return;
      }
    } else if (!parsedAmount || parsedAmount === 0) {
      Alert.alert('입력 오류', '손익 금액은 0이 될 수 없습니다.');
      return;
    }
    const accountCurrency = account.type === 'INVEST' ? account.currency ?? 'KRW' : 'KRW';
    const inputCurrency = account.type === 'INVEST' ? recordInputCurrency : 'KRW';
    const fxRateForRecord = account.type === 'INVEST' && accountCurrency === 'USD' ? usdKrwRate ?? undefined : undefined;
    let convertedAbs = Math.abs(parsedAmount);
    if (accountCurrency !== inputCurrency) {
      if (!usdKrwRate || usdKrwRate <= 0) {
        Alert.alert('환율 오류', '환율 정보를 불러오지 못해 다른 화폐로 등록할 수 없습니다.');
        return;
      }
      if (inputCurrency === 'KRW' && accountCurrency === 'USD') {
        convertedAbs = convertedAbs / usdKrwRate;
      } else if (inputCurrency === 'USD' && accountCurrency === 'KRW') {
        convertedAbs = convertedAbs * usdKrwRate;
      }
    } else if (account.type === 'INVEST' && accountCurrency === 'USD' && (!usdKrwRate || usdKrwRate <= 0)) {
      Alert.alert('환율 오류', '환율 정보를 불러오지 못해 저장할 수 없습니다.');
      return;
    }
    const roundedConverted = accountCurrency === 'USD'
      ? Math.round(convertedAbs * 100) / 100
      : Math.trunc(convertedAbs);
    const normalizedAmount =
      recordEntryType === 'LOSS'
        ? -roundedConverted
        : roundedConverted;
    const normalizedKind: AssetFlowRecordKind =
      recordEntryType === 'DEPOSIT'
        ? 'DEPOSIT'
        : recordEntryType === 'WITHDRAW'
          ? 'WITHDRAW'
          : recordEntryType === 'INTEREST'
            ? 'INTEREST'
            : 'PNL';

    const userId = await requireAuthenticatedUserId();
    if (recordEditId === null) {
      await addLocalAssetFlowRecord(userId, account.id, {
        kind: normalizedKind,
        amount: normalizedAmount,
        fxRate: fxRateForRecord,
        occurredAt,
        memo: memo.trim() || null,
      });
    } else {
      await updateLocalAssetFlowRecord(userId, account.id, recordEditId, {
        kind: normalizedKind,
        amount: normalizedAmount,
        fxRate: fxRateForRecord,
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

  const handleOpenInterestModal = () => {
    if (!account) return;
    setInterestAmount(null);
    setInterestPrincipal(String(Math.max(totalAmount, 0)));
    setInterestStartDate(dayjs(account.createdAt).format('YYYY-MM-DD'));
    setInterestEndDate(dayjs().format('YYYY-MM-DD'));
    setInterestCalcModalOpen(true);
  };

  const handleCalculateInterest = () => {
    const principal = Number(interestPrincipal);
    const rate = interestRateInput.trim() === '' ? 0 : Number(interestRateInput);
    if (!principal || principal <= 0) {
      Alert.alert('입력 오류', '원금을 올바르게 입력해 주세요.');
      return;
    }
    if (!rate || rate <= 0) {
      Alert.alert('입력 오류', '이율을 올바르게 입력해 주세요.');
      return;
    }
    const start = dayjs(interestStartDate, 'YYYY-MM-DD', true);
    const end = dayjs(interestEndDate, 'YYYY-MM-DD', true);
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      Alert.alert('입력 오류', '기간을 올바르게 입력해 주세요.');
      return;
    }

    const days = end.diff(start, 'day') + 1;
    let interest = 0;
    if (interestType === 'SIMPLE') {
      interest = principal * (rate / 100) * (days / 365);
    } else {
      const months = end.diff(start, 'month', true);
      interest = principal * Math.pow(1 + rate / 100 / 12, months) - principal;
    }

    if (!account) return;
    const rounded = account.currency === 'USD'
      ? Math.round(interest * 100) / 100
      : Math.trunc(interest);
    setInterestAmount(Math.max(0, rounded));
  };

  const handleCommitInterest = async () => {
    if (!account || interestAmount === null || interestAmount <= 0) {
      Alert.alert('입력 오류', '이자 금액을 계산해 주세요.');
      return;
    }
    const userId = await requireAuthenticatedUserId();
    await addLocalAssetFlowRecord(userId, account.id, {
      kind: 'INTEREST',
      amount: interestAmount,
      fxRate: account.type === 'INVEST' && account.currency === 'USD' ? usdKrwRate ?? undefined : undefined,
      occurredAt: dayjs(interestEndDate, 'YYYY-MM-DD', true).isValid()
        ? dayjs(interestEndDate, 'YYYY-MM-DD').toISOString()
        : dayjs().toISOString(),
      memo: '이자 정산',
    });
    setInterestCalcModalOpen(false);
    await loadAccount();
    await Promise.all([loadTransactions(), loadCategories()]);
  };

  if (!account) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.helperText}>상품을 불러오는 중입니다.</Text>
      </View>
    );
  }

  const maturityDue = account.maturityDate
    ? dayjs().isAfter(dayjs(account.maturityDate), 'day') || dayjs().isSame(dayjs(account.maturityDate), 'day')
    : false;

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

      {maturityDue ? (
        <View style={styles.maturityBanner}>
          <View>
            <Text style={styles.maturityTitle}>만기 도래</Text>
            <Text style={styles.maturityText}>만기일 {account.maturityDate} · 인출 처리를 진행해 주세요.</Text>
          </View>
          <Pressable style={styles.maturityButton} onPress={openWithdrawModal}>
            <Text style={styles.maturityButtonText}>인출</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable style={styles.addRecordButton} onPress={openAddRecordModal}>
          <Text style={styles.addRecordButtonText}>내역 추가</Text>
        </Pressable>
        <Pressable style={styles.addRecordGhostButton} onPress={handleOpenInterestModal}>
          <Text style={styles.addRecordGhostText}>이자 계산</Text>
        </Pressable>
      </View>

      <View style={styles.listWrap}>
        {sortedRecords.length === 0 ? (
          <Text style={styles.helperText}>등록된 내역이 없습니다.</Text>
        ) : (
          sortedRecords.map((record) => {
            const kind = record.kind ?? 'DEPOSIT';
            const netAmount = getRecordNetAmount(record);
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
                      netAmount > 0 ? styles.recordPnlPlus : null,
                      netAmount < 0 ? styles.recordPnlMinus : null,
                    ]}
                  >
                    {netAmount > 0 ? '+' : ''}
                    {formatCurrencyAmount(netAmount, account.type === 'SAVINGS' ? 'KRW' : account.currency ?? 'KRW')}
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
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <ScrollView contentContainerStyle={styles.modalContentContainer} keyboardShouldPersistTaps="handled">
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
              <TextField
                label="연이율(%)"
                value={interestRateInput}
                onChangeText={setInterestRateInput}
                placeholder="예: 3.5"
                keyboardType="numeric"
              />
              <View style={styles.radioRow}>
                <Pressable
                  style={[styles.radioChip, interestType === 'SIMPLE' && styles.radioChipActive]}
                  onPress={() => setInterestType('SIMPLE')}
                >
                  <Text style={interestType === 'SIMPLE' ? styles.radioChipTextActive : styles.radioChipText}>단리</Text>
                </Pressable>
                <Pressable
                  style={[styles.radioChip, interestType === 'COMPOUND' && styles.radioChipActive]}
                  onPress={() => setInterestType('COMPOUND')}
                >
                  <Text style={interestType === 'COMPOUND' ? styles.radioChipTextActive : styles.radioChipText}>월복리</Text>
                </Pressable>
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateFieldLabel}>만기일</Text>
                <Pressable style={styles.dateButton} onPress={() => setShowMaturityDatePicker(true)}>
                  <Text style={styles.dateButtonText}>{maturityDateInput || '미설정'}</Text>
                </Pressable>
              </View>
              {showMaturityDatePicker ? (
                <DateTimePicker
                  value={dayjs(maturityDateInput || dayjs().format('YYYY-MM-DD')).toDate()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, selectedDate) => {
                    if (selectedDate) {
                      setMaturityDateInput(dayjs(selectedDate).format('YYYY-MM-DD'));
                    }
                    if (Platform.OS !== 'ios') {
                      setShowMaturityDatePicker(false);
                    }
                  }}
                />
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
            </TouchableWithoutFeedback>
          </View>
        </View>
      </Modal>

      <Modal visible={recordModalVisible} transparent animationType="slide" onRequestClose={() => setRecordModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <ScrollView contentContainerStyle={styles.modalContentContainer} keyboardShouldPersistTaps="handled">
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
                  style={[styles.radioChip, recordEntryType === 'WITHDRAW' && styles.radioChipActive]}
                  onPress={() => setRecordEntryType('WITHDRAW')}
                >
                  <Text style={recordEntryType === 'WITHDRAW' ? styles.radioChipTextActive : styles.radioChipText}>인출</Text>
                </Pressable>
                <Pressable
                  style={[styles.radioChip, recordEntryType === 'INTEREST' && styles.radioChipActive]}
                  onPress={() => setRecordEntryType('INTEREST')}
                >
                  <Text style={recordEntryType === 'INTEREST' ? styles.radioChipTextActive : styles.radioChipText}>이자</Text>
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
                label={`${
                  recordEntryType === 'DEPOSIT'
                    ? '입금 금액'
                    : recordEntryType === 'WITHDRAW'
                      ? '인출 금액'
                      : recordEntryType === 'INTEREST'
                        ? '이자 금액'
                        : '손익 금액'
                } (${account.type === 'INVEST' ? recordInputCurrency : 'KRW'})`}
                value={amount}
                onChangeText={setAmount}
                placeholder={recordEntryType === 'DEPOSIT' || recordEntryType === 'WITHDRAW' || recordEntryType === 'INTEREST' ? '예: 300000' : '예: 120000'}
              />
              {account.type === 'INVEST' ? (
                <View style={styles.radioRow}>
                  {currencyOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[styles.radioChip, recordInputCurrency === option.value && styles.radioChipActive]}
                      onPress={() => setRecordInputCurrency(option.value)}
                    >
                      <Text style={recordInputCurrency === option.value ? styles.radioChipTextActive : styles.radioChipText}>
                        입력 {option.value}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {account.type === 'INVEST' && recordInputCurrency !== (account.currency ?? 'KRW') && usdKrwRate ? (
                <View style={styles.modalRateNotice}>
                  <Text style={styles.modalRateNoticeText}>
                    저장 시 {account.currency ?? 'KRW'} 기준으로 자동 환산됩니다. (1 USD = {usdKrwRate.toLocaleString()}원)
                  </Text>
                </View>
              ) : null}
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
            </TouchableWithoutFeedback>
          </View>
        </View>
      </Modal>

      <Modal visible={interestCalcModalOpen} transparent animationType="slide" onRequestClose={() => setInterestCalcModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <ScrollView contentContainerStyle={styles.modalContentContainer} keyboardShouldPersistTaps="handled">
              <Pressable style={styles.modalCloseButton} onPress={() => setInterestCalcModalOpen(false)}>
                <Text style={styles.modalCloseText}>X</Text>
              </Pressable>
              <Text style={styles.modalTitle}>이자 계산</Text>
              <TextField
                label="원금"
                value={interestPrincipal}
                onChangeText={setInterestPrincipal}
                placeholder="예: 1000000"
                keyboardType="numeric"
              />
              <TextField
                label="연이율(%)"
                value={interestRateInput}
                onChangeText={setInterestRateInput}
                placeholder="예: 3.5"
                keyboardType="numeric"
              />
              <View style={styles.radioRow}>
                <Pressable
                  style={[styles.radioChip, interestType === 'SIMPLE' && styles.radioChipActive]}
                  onPress={() => setInterestType('SIMPLE')}
                >
                  <Text style={interestType === 'SIMPLE' ? styles.radioChipTextActive : styles.radioChipText}>단리</Text>
                </Pressable>
                <Pressable
                  style={[styles.radioChip, interestType === 'COMPOUND' && styles.radioChipActive]}
                  onPress={() => setInterestType('COMPOUND')}
                >
                  <Text style={interestType === 'COMPOUND' ? styles.radioChipTextActive : styles.radioChipText}>월복리</Text>
                </Pressable>
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateFieldLabel}>시작일</Text>
                <Pressable style={styles.dateButton} onPress={() => setShowInterestStartPicker(true)}>
                  <Text style={styles.dateButtonText}>{interestStartDate}</Text>
                </Pressable>
              </View>
              {showInterestStartPicker ? (
                <DateTimePicker
                  value={dayjs(interestStartDate).toDate()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, selectedDate) => {
                    if (selectedDate) {
                      setInterestStartDate(dayjs(selectedDate).format('YYYY-MM-DD'));
                    }
                    if (Platform.OS !== 'ios') {
                      setShowInterestStartPicker(false);
                    }
                  }}
                />
              ) : null}
              <View style={styles.dateField}>
                <Text style={styles.dateFieldLabel}>종료일</Text>
                <Pressable style={styles.dateButton} onPress={() => setShowInterestEndPicker(true)}>
                  <Text style={styles.dateButtonText}>{interestEndDate}</Text>
                </Pressable>
              </View>
              {showInterestEndPicker ? (
                <DateTimePicker
                  value={dayjs(interestEndDate).toDate()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, selectedDate) => {
                    if (selectedDate) {
                      setInterestEndDate(dayjs(selectedDate).format('YYYY-MM-DD'));
                    }
                    if (Platform.OS !== 'ios') {
                      setShowInterestEndPicker(false);
                    }
                  }}
                />
              ) : null}
              <View style={styles.modalActions}>
                <PrimaryButton title="계산" onPress={handleCalculateInterest} variant="secondary" />
                <PrimaryButton title="이자 기록" onPress={handleCommitInterest} variant="primary" />
              </View>
              {interestAmount !== null ? (
                <Text style={styles.interestResultText}>
                  예상 이자: {formatCurrencyAmount(interestAmount, account.type === 'SAVINGS' ? 'KRW' : account.currency ?? 'KRW')}
                </Text>
              ) : null}
            </ScrollView>
            </TouchableWithoutFeedback>
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
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerActionRowCompact: {
    flexDirection: 'row',
    position: 'absolute',
    top: 10,
    right: 10,
    gap: 8,
  },
  headerActionCompact: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  headerEditCompact: {
    borderColor: '#1e293b',
  },
  headerDeleteCompact: {
    borderColor: '#ef4444',
  },
  headerActionCompactText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerDeleteCompactText: {
    fontSize: 12,
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
  modalRateNotice: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  modalRateNoticeText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: '#475569',
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
  addRecordGhostButton: {
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  addRecordGhostText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  maturityBanner: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  maturityTitle: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  maturityText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
  },
  maturityButton: {
    backgroundColor: '#92400e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  maturityButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  interestResultText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  listWrap: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
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
    color: '#dc2626',
  },
  recordPnlMinus: {
    color: '#2563eb',
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
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
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
