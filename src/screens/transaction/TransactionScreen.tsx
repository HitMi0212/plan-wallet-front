import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { TransactionType } from '../../services/transactionApi';
import { useTransactionStore } from '../../stores/transactionStore';

const typeOptions: { label: string; value: TransactionType }[] = [
  { label: '지출', value: 'EXPENSE' },
  { label: '수입', value: 'INCOME' },
];

export function TransactionScreen() {
  const { items, loading, error, load, add, update, remove } = useTransactionStore();

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [memo, setMemo] = useState('');
  const [occurredAt, setOccurredAt] = useState(dayjs().toISOString());

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingAmount, setEditingAmount] = useState('');
  const [editingMemo, setEditingMemo] = useState('');
  const [editingOccurredAt, setEditingOccurredAt] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [editingType, setEditingType] = useState<TransactionType>('EXPENSE');

  useEffect(() => {
    load();
  }, [load]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [items]
  );

  const handleAdd = async () => {
    const parsedAmount = Number(amount);
    const parsedCategory = Number(categoryId);

    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('입력 오류', '금액을 올바르게 입력해 주세요.');
      return;
    }
    if (!parsedCategory || parsedCategory <= 0) {
      Alert.alert('입력 오류', '카테고리 ID를 입력해 주세요.');
      return;
    }

    await add({
      type,
      amount: parsedAmount,
      categoryId: parsedCategory,
      memo: memo.trim() || null,
      occurredAt,
    });

    setAmount('');
    setCategoryId('');
    setMemo('');
    setOccurredAt(dayjs().toISOString());
  };

  const startEdit = (id: number) => {
    const target = items.find((item) => item.id === id);
    if (!target) return;
    setEditingId(id);
    setEditingType(target.type);
    setEditingAmount(String(target.amount));
    setEditingCategoryId(String(target.categoryId));
    setEditingMemo(target.memo ?? '');
    setEditingOccurredAt(target.occurredAt);
  };

  const handleUpdate = async () => {
    if (editingId === null) return;

    const parsedAmount = Number(editingAmount);
    const parsedCategory = Number(editingCategoryId);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('입력 오류', '금액을 올바르게 입력해 주세요.');
      return;
    }
    if (!parsedCategory || parsedCategory <= 0) {
      Alert.alert('입력 오류', '카테고리 ID를 입력해 주세요.');
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
  };

  const handleDelete = (id: number) => {
    Alert.alert('삭제 확인', '거래를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => remove(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>거래</Text>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>새 거래</Text>
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
        <TextField label="카테고리 ID" value={categoryId} onChangeText={setCategoryId} placeholder="예: 10" />
        <TextField label="메모" value={memo} onChangeText={setMemo} placeholder="예: 점심" />
        <TextField
          label="발생 일시(ISO)"
          value={occurredAt}
          onChangeText={setOccurredAt}
          placeholder="2025-01-01T00:00:00Z"
        />
        <PrimaryButton title={loading ? '처리 중...' : '추가'} onPress={handleAdd} disabled={loading} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>거래 목록</Text>
        <Pressable style={styles.refreshButton} onPress={load}>
          <Text style={styles.refreshText}>새로고침</Text>
        </Pressable>
      </View>

      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>등록된 거래가 없습니다.</Text>}
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
                <TextInput style={styles.editInput} value={editingCategoryId} onChangeText={setEditingCategoryId} />
                <TextInput style={styles.editInput} value={editingMemo} onChangeText={setEditingMemo} />
                <TextInput style={styles.editInput} value={editingOccurredAt} onChangeText={setEditingOccurredAt} />
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
                  <Text style={styles.itemName}>{item.type === 'EXPENSE' ? '지출' : '수입'} {item.amount.toLocaleString()}원</Text>
                  <Text style={styles.itemMeta}>카테고리 {item.categoryId} · {dayjs(item.occurredAt).format('YYYY-MM-DD')}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },
  formCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
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
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#ef4444',
    marginBottom: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
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
  empty: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 20,
  },
});
