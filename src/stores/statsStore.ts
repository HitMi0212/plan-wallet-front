import { create } from 'zustand';
import dayjs from 'dayjs';

import {
  CategoryTotalResponse,
  DailyTotalResponse,
  MonthlyComparisonResponse,
  MonthlySummaryResponse,
  fetchCategoryTotals,
  fetchDailyTotals,
  fetchMonthlyComparison,
  fetchMonthlySummary,
} from '../services/statsApi';

interface StatsState {
  monthly: MonthlySummaryResponse | null;
  comparison: MonthlyComparisonResponse | null;
  categoryTotals: CategoryTotalResponse[];
  dailyTotals: DailyTotalResponse[];
  loading: boolean;
  error: string | null;
  load: (year: number, month: number) => Promise<void>;
}

export const useStatsStore = create<StatsState>((set) => ({
  monthly: null,
  comparison: null,
  categoryTotals: [],
  dailyTotals: [],
  loading: false,
  error: null,

  load: async (year, month) => {
    set({ loading: true, error: null });
    try {
      const [monthly, comparison, categoryTotals, dailyTotals] = await Promise.all([
        fetchMonthlySummary(year, month),
        fetchMonthlyComparison(year, month),
        fetchCategoryTotals(
          dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('YYYY-MM-01'),
          dayjs(`${year}-${String(month).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD')
        ),
        fetchDailyTotals(year, month),
      ]);

      set({ monthly, comparison, categoryTotals, dailyTotals, loading: false });
    } catch (error) {
      set({ error: '통계를 불러오지 못했습니다.', loading: false });
    }
  },
}));
