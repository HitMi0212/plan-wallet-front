import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  FlatList,
  Modal,
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
import { CategoryType, ExpenseCategoryKind } from '../../services/categoryApi';
import { useCategoryStore } from '../../stores/categoryStore';

const typeOptions: { label: string; value: CategoryType }[] = [
  { label: '지출', value: 'EXPENSE' },
  { label: '수입', value: 'INCOME' },
];

const expenseKindOptions: { label: string; value: ExpenseCategoryKind }[] = [
  { label: '일반', value: 'NORMAL' },
  { label: '예적금', value: 'SAVINGS' },
  { label: '투자', value: 'INVEST' },
];

type CategoryFilter = 'ALL' | ExpenseCategoryKind;

const filterOptions: { label: string; value: CategoryFilter }[] = [
  { label: '전체', value: 'ALL' },
  { label: '일반', value: 'NORMAL' },
  { label: '예적금', value: 'SAVINGS' },
  { label: '투자', value: 'INVEST' },
];
const FILTER_STORAGE_KEY = 'plan-wallet.category.filter';

function expenseKindLabel(kind?: ExpenseCategoryKind) {
  if (kind === 'SAVINGS') return '예적금';
  if (kind === 'INVEST') return '투자';
  return '일반';
}

export function CategoryScreen() {
  const { items, loading, error, load, add, update, remove } = useCategoryStore();

  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [expenseKind, setExpenseKind] = useState<ExpenseCategoryKind>('NORMAL');
  const [filter, setFilter] = useState<CategoryFilter>('ALL');
  const [addModalVisible, setAddModalVisible] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingExpenseKind, setEditingExpenseKind] = useState<ExpenseCategoryKind>('NORMAL');

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(FILTER_STORAGE_KEY);
      if (!stored) return;
      if (filterOptions.some((option) => option.value === stored)) {
        setFilter(stored as CategoryFilter);
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(FILTER_STORAGE_KEY, filter);
  }, [filter]);

  const sortedItems = useMemo(() => {
    const filtered =
      filter === 'ALL'
        ? items
        : items.filter((item) => item.type === 'EXPENSE' && (item.expenseKind ?? 'NORMAL') === filter);

    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, filter]);

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('입력 오류', '카테고리 이름을 입력해 주세요.');
      return;
    }
    await add({
      name: name.trim(),
      type,
      expenseKind: type === 'EXPENSE' ? expenseKind : 'NORMAL',
    });
    setAddModalVisible(false);
    setName('');
    setType('EXPENSE');
    setExpenseKind('NORMAL');
  };

  const startEdit = (id: number, currentName: string, currentType: CategoryType, currentExpenseKind?: ExpenseCategoryKind) => {
    setEditingId(id);
    setEditingName(currentName);
    setEditingExpenseKind(currentType === 'EXPENSE' ? currentExpenseKind ?? 'NORMAL' : 'NORMAL');
  };

  const handleUpdate = async (currentType: CategoryType) => {
    if (editingId === null) return;
    if (!editingName.trim()) {
      Alert.alert('입력 오류', '카테고리 이름을 입력해 주세요.');
      return;
    }
    await update(editingId, editingName.trim(), currentType === 'EXPENSE' ? editingExpenseKind : 'NORMAL');
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = (id: number) => {
    Alert.alert('삭제 확인', '카테고리를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => remove(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>카테고리 목록</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.refreshButton}
            onPress={() => {
              setType('EXPENSE');
              setExpenseKind('NORMAL');
              setName('');
              setAddModalVisible(true);
            }}
          >
            <Text style={styles.refreshText}>추가</Text>
          </Pressable>
          <Pressable style={styles.refreshButton} onPress={load}>
            <Text style={styles.refreshText}>새로고침</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.typeRow}>
        {filterOptions.map((option) => (
          <Pressable
            key={option.value}
            style={[styles.typeChip, filter === option.value && styles.typeChipActive]}
            onPress={() => setFilter(option.value)}
          >
            <Text style={filter === option.value ? styles.typeChipTextActive : styles.typeChipText}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<EmptyState title="등록된 카테고리가 없습니다." description="카테고리를 추가해 주세요." />}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            {editingId === item.id ? (
              <View style={styles.editBox}>
                <TextInput style={styles.editInput} value={editingName} onChangeText={setEditingName} />
                {item.type === 'EXPENSE' ? (
                  <View style={styles.typeRow}>
                    {expenseKindOptions.map((option) => (
                      <Pressable
                        key={option.value}
                        style={[styles.typeChip, editingExpenseKind === option.value && styles.typeChipActive]}
                        onPress={() => setEditingExpenseKind(option.value)}
                      >
                        <Text
                          style={
                            editingExpenseKind === option.value ? styles.typeChipTextActive : styles.typeChipText
                          }
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <View style={styles.actions}>
                  <Pressable style={styles.actionButton} onPress={() => handleUpdate(item.type)}>
                    <Text style={styles.actionText}>저장</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => {
                      setEditingId(null);
                      setEditingName('');
                    }}
                  >
                    <Text style={styles.actionText}>취소</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <View>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemType}>
                    {item.type === 'EXPENSE'
                      ? `지출 · ${expenseKindLabel(item.expenseKind)}`
                      : '수입'}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => startEdit(item.id, item.name, item.type, item.expenseKind)}
                  >
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
              <Text style={styles.sectionTitle}>새 카테고리</Text>
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
              {type === 'EXPENSE' ? (
                <View style={styles.typeRow}>
                  {expenseKindOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[styles.typeChip, expenseKind === option.value && styles.typeChipActive]}
                      onPress={() => setExpenseKind(option.value)}
                    >
                      <Text style={expenseKind === option.value ? styles.typeChipTextActive : styles.typeChipText}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <TextField label="카테고리 이름" value={name} onChangeText={setName} placeholder="예: 식비" />
              <View style={styles.modalActions}>
                <PrimaryButton title={loading ? '처리 중...' : '추가'} onPress={handleAdd} disabled={loading} />
                <PrimaryButton title="취소" onPress={() => setAddModalVisible(false)} />
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
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
  itemType: {
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
  modalActions: {
    gap: 8,
    marginTop: 8,
  },
});
