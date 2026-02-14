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
import { CategoryType } from '../../services/categoryApi';
import { useCategoryStore } from '../../stores/categoryStore';

const typeOptions: { label: string; value: CategoryType }[] = [
  { label: '지출', value: 'EXPENSE' },
  { label: '수입', value: 'INCOME' },
];

export function CategoryScreen() {
  const { items, loading, error, load, add, update, remove } = useCategoryStore();

  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    load();
  }, [load]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('입력 오류', '카테고리 이름을 입력해 주세요.');
      return;
    }
    await add({ name: name.trim(), type });
    setName('');
  };

  const startEdit = (id: number, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleUpdate = async () => {
    if (editingId === null) return;
    if (!editingName.trim()) {
      Alert.alert('입력 오류', '카테고리 이름을 입력해 주세요.');
      return;
    }
    await update(editingId, editingName.trim());
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
      <Text style={styles.title}>카테고리</Text>

      <View style={styles.formCard}>
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
        <TextField label="카테고리 이름" value={name} onChangeText={setName} placeholder="예: 식비" />
        <PrimaryButton title={loading ? '처리 중...' : '추가'} onPress={handleAdd} disabled={loading} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>카테고리 목록</Text>
        <Pressable style={styles.refreshButton} onPress={load}>
          <Text style={styles.refreshText}>새로고침</Text>
        </Pressable>
      </View>

      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>등록된 카테고리가 없습니다.</Text>}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            {editingId === item.id ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.editInput}
                  value={editingName}
                  onChangeText={setEditingName}
                />
                <Pressable style={styles.actionButton} onPress={handleUpdate}>
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
            ) : (
              <>
                <View>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemType}>{item.type === 'EXPENSE' ? '지출' : '수입'}</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable style={styles.actionButton} onPress={() => startEdit(item.id, item.name)}>
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
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  editInput: {
    flex: 1,
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
