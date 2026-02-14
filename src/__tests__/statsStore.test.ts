import { act } from '@testing-library/react-native';

import { useStatsStore } from '../stores/statsStore';

jest.mock('../services/statsApi', () => ({
  fetchMonthlySummary: jest.fn(async () => ({ year: 2025, month: 1, incomeTotal: 1000, expenseTotal: 500 })),
  fetchMonthlyComparison: jest.fn(async () => ({
    year: 2025,
    month: 1,
    incomeTotal: 1000,
    expenseTotal: 500,
    prevIncomeTotal: 800,
    prevExpenseTotal: 400,
  })),
  fetchCategoryTotals: jest.fn(async () => [{ categoryId: 10, total: 500 }]),
}));

describe('statsStore', () => {
  beforeEach(() => {
    useStatsStore.setState({
      monthly: null,
      comparison: null,
      categoryTotals: [],
      loading: false,
      error: null,
    });
  });

  it('loads stats data', async () => {
    await act(async () => {
      await useStatsStore.getState().load(2025, 1);
    });

    const state = useStatsStore.getState();
    expect(state.monthly?.incomeTotal).toBe(1000);
    expect(state.categoryTotals.length).toBe(1);
  });
});
