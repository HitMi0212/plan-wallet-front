import { create } from 'zustand';

import { Category, CategoryCreateRequest, ExpenseCategoryKind } from '../services/categoryApi';
import { createCategory, deleteCategory, fetchCategories, updateCategory } from '../services/categoryClient';

interface CategoryState {
  items: Category[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (payload: CategoryCreateRequest) => Promise<void>;
  update: (id: number, name: string, expenseKind?: ExpenseCategoryKind) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchCategories();
      set({ items: data, loading: false });
    } catch (error: any) {
      set({ error: '카테고리를 불러오지 못했습니다.', loading: false });
    }
  },

  add: async (payload) => {
    set({ loading: true, error: null });
    try {
      const created = await createCategory(payload);
      set({ items: [created, ...get().items], loading: false });
    } catch (error: any) {
      set({ error: '카테고리를 추가하지 못했습니다.', loading: false });
    }
  },

  update: async (id, name, expenseKind) => {
    set({ loading: true, error: null });
    try {
      const updated = await updateCategory(id, { name, expenseKind });
      set({
        items: get().items.map((item) => (item.id === id ? updated : item)),
        loading: false,
      });
    } catch (error: any) {
      set({ error: '카테고리를 수정하지 못했습니다.', loading: false });
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await deleteCategory(id);
      set({ items: get().items.filter((item) => item.id !== id), loading: false });
    } catch (error: any) {
      set({ error: '카테고리를 삭제하지 못했습니다.', loading: false });
    }
  },
}));
