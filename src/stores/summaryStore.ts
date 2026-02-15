import { create } from 'zustand';

import { MonthlySummaryResponse, fetchMonthlySummary } from '../services/statsApi';

interface SummaryState {
  monthly: MonthlySummaryResponse | null;
  loading: boolean;
  error: string | null;
  load: (year: number, month: number) => Promise<void>;
}

export const useSummaryStore = create<SummaryState>((set) => ({
  monthly: null,
  loading: false,
  error: null,

  load: async (year, month) => {
    set({ loading: true, error: null });
    try {
      const monthly = await fetchMonthlySummary(year, month);
      set({ monthly, loading: false });
    } catch (error) {
      set({ error: '요약 정보를 불러오지 못했습니다.', loading: false });
    }
  },
}));
