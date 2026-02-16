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

type CategoryFilter = CategoryType;

const filterOptions: { label: string; value: CategoryFilter }[] = [
  { label: '지출', value: 'EXPENSE' },
  { label: '수입', value: 'INCOME' },
];

const FILTER_STORAGE_KEY = 'plan-wallet.category.filter';

function expenseKindLabel(kind?: ExpenseCategoryKind) {
  if (kind === 'SAVINGS') return '예적금';
  if (kind === 'INVEST') return '투자';
  return '일반';
}

type CategoryScreenProps = {
  route?: {
    params?: {
      filter?: CategoryType;
    };
  };
};

export function CategoryScreen({ route }: CategoryScreenProps) {
  const { items, loading, error, load, add, remove } = useCategoryStore();
  const forcedFilter = route?.params?.filter;

  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>(forcedFilter ?? 'EXPENSE');
  const [filter, setFilter] = useState<CategoryFilter>(forcedFilter ?? 'EXPENSE');
  const [addModalVisible, setAddModalVisible] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (forcedFilter) {
      setFilter(forcedFilter);
      setType(forcedFilter);
    }
  }, [forcedFilter]);

  useEffect(() => {
    if (forcedFilter) {
      return;
    }

    (async () => {
      const stored = await AsyncStorage.getItem(FILTER_STORAGE_KEY);
      if (!stored) return;
      if (filterOptions.some((option) => option.value === stored)) {
        setFilter(stored as CategoryFilter);
      }
    })();
  }, [forcedFilter]);

  useEffect(() => {
    if (forcedFilter) {
      return;
    }
    AsyncStorage.setItem(FILTER_STORAGE_KEY, filter);
  }, [filter, forcedFilter]);

  const sortedItems = useMemo(() => {
    const filtered = items.filter((item) => item.type === filter);
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, filter]);

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('입력 오류', '카테고리 이름을 입력해 주세요.');
      return;
    }

    await add({
      name: name.trim(),
      type: forcedFilter ?? type,
      expenseKind: 'NORMAL',
    });

    setAddModalVisible(false);
    setName('');
    setType(forcedFilter ?? 'EXPENSE');
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
              setType(filter);
              setName('');
              setAddModalVisible(true);
            }}
          >
            <Text style={styles.refreshText}>추가</Text>
          </Pressable>
        </View>
      </View>

      {!forcedFilter ? (
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
      ) : null}

      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<EmptyState title="등록된 카테고리가 없습니다." description="카테고리를 추가해 주세요." />}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemType}>
                {item.type === 'EXPENSE' ? `지출 · ${expenseKindLabel(item.expenseKind)}` : '수입'}
              </Text>
            </View>
            <View style={styles.actions}>
              <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDelete(item.id)}>
                <Text style={[styles.actionText, styles.deleteActionText]}>삭제</Text>
              </Pressable>
            </View>
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
              {!forcedFilter ? (
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
              ) : null}
              <TextField label="카테고리 이름" value={name} onChangeText={setName} placeholder="예: 식비" />
              <View style={styles.modalActions}>
                <PrimaryButton
                  title={loading ? '처리 중...' : '추가'}
                  onPress={handleAdd}
                  disabled={loading}
                  variant="primary"
                />
                <PrimaryButton title="취소" onPress={() => setAddModalVisible(false)} variant="secondary" />
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
    color: '#ffffff',
    fontWeight: '700',
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
    backgroundColor: 'transparent',
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
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  deleteButton: {
    borderColor: '#ef4444',
  },
  actionText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteActionText: {
    color: '#dc2626',
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
