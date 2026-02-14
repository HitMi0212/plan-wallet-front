import { create } from 'zustand';

import {
  Transaction,
  TransactionCreateRequest,
  TransactionUpdateRequest,
} from '../services/transactionApi';
import {
  createTransaction,
  deleteTransaction,
  fetchTransactions,
  updateTransaction,
} from '../services/transactionClient';

interface TransactionState {
  items: Transaction[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (payload: TransactionCreateRequest) => Promise<void>;
  update: (id: number, payload: TransactionUpdateRequest) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchTransactions();
      set({ items: data, loading: false });
    } catch (error) {
      set({ error: '거래 목록을 불러오지 못했습니다.', loading: false });
    }
  },

  add: async (payload) => {
    set({ loading: true, error: null });
    try {
      const created = await createTransaction(payload);
      set({ items: [created, ...get().items], loading: false });
    } catch (error) {
      set({ error: '거래를 추가하지 못했습니다.', loading: false });
    }
  },

  update: async (id, payload) => {
    set({ loading: true, error: null });
    try {
      const updated = await updateTransaction(id, payload);
      set({
        items: get().items.map((item) => (item.id === id ? updated : item)),
        loading: false,
      });
    } catch (error) {
      set({ error: '거래를 수정하지 못했습니다.', loading: false });
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await deleteTransaction(id);
      set({ items: get().items.filter((item) => item.id !== id), loading: false });
    } catch (error) {
      set({ error: '거래를 삭제하지 못했습니다.', loading: false });
    }
  },
}));
