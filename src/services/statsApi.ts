import { getApiClient } from './api';

export interface MonthlySummaryResponse {
  year: number;
  month: number;
  incomeTotal: number;
  expenseTotal: number;
}

export interface MonthlyComparisonResponse {
  year: number;
  month: number;
  incomeTotal: number;
  expenseTotal: number;
  prevIncomeTotal: number;
  prevExpenseTotal: number;
}

export interface CategoryTotalResponse {
  categoryId: number;
  total: number;
}

const client = () => getApiClient();

export async function fetchMonthlySummary(year: number, month: number): Promise<MonthlySummaryResponse> {
  const response = await client().get(`/stats/monthly?year=${year}&month=${month}`);
  return response.data as MonthlySummaryResponse;
}

export async function fetchMonthlyComparison(year: number, month: number): Promise<MonthlyComparisonResponse> {
  const response = await client().get(`/stats/monthly/compare?year=${year}&month=${month}`);
  return response.data as MonthlyComparisonResponse;
}

export async function fetchCategoryTotals(from: string, to: string): Promise<CategoryTotalResponse[]> {
  const response = await client().get(`/stats/categories?from=${from}&to=${to}`);
  return response.data as CategoryTotalResponse[];
}
