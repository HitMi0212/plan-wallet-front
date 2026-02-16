import dayjs from 'dayjs';

import { getLocalTransactions, requireAuthenticatedUserId } from './localDb';

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

function toMonthlySummary(year: number, month: number, occurredAtValues: { type: 'INCOME' | 'EXPENSE'; amount: number }[]) {
  const incomeTotal = occurredAtValues
    .filter((item) => item.type === 'INCOME')
    .reduce((sum, item) => sum + item.amount, 0);
  const expenseTotal = occurredAtValues
    .filter((item) => item.type === 'EXPENSE')
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    year,
    month,
    incomeTotal,
    expenseTotal,
  };
}

export async function fetchMonthlySummary(year: number, month: number): Promise<MonthlySummaryResponse> {
  const userId = await requireAuthenticatedUserId();
  const transactions = await getLocalTransactions(userId);

  const monthlyItems = transactions.filter((item) => {
    const d = dayjs(item.occurredAt);
    return d.year() === year && d.month() + 1 === month;
  });

  return toMonthlySummary(year, month, monthlyItems);
}

export async function fetchMonthlyComparison(year: number, month: number): Promise<MonthlyComparisonResponse> {
  const userId = await requireAuthenticatedUserId();
  const transactions = await getLocalTransactions(userId);

  const currentItems = transactions.filter((item) => {
    const d = dayjs(item.occurredAt);
    return d.year() === year && d.month() + 1 === month;
  });

  const prevDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).subtract(1, 'month');
  const prevItems = transactions.filter((item) => {
    const d = dayjs(item.occurredAt);
    return d.year() === prevDate.year() && d.month() === prevDate.month();
  });

  const current = toMonthlySummary(year, month, currentItems);
  const prev = toMonthlySummary(prevDate.year(), prevDate.month() + 1, prevItems);

  return {
    year,
    month,
    incomeTotal: current.incomeTotal,
    expenseTotal: current.expenseTotal,
    prevIncomeTotal: prev.incomeTotal,
    prevExpenseTotal: prev.expenseTotal,
  };
}

export async function fetchCategoryTotals(from: string, to: string): Promise<CategoryTotalResponse[]> {
  const userId = await requireAuthenticatedUserId();
  const transactions = await getLocalTransactions(userId);

  const fromDate = dayjs(from).startOf('day');
  const toDate = dayjs(to).endOf('day');

  const totals = new Map<number, number>();

  transactions
    .filter((item) => {
      const d = dayjs(item.occurredAt);
      return d.isAfter(fromDate) || d.isSame(fromDate);
    })
    .filter((item) => {
      const d = dayjs(item.occurredAt);
      return d.isBefore(toDate) || d.isSame(toDate);
    })
    .forEach((item) => {
      totals.set(item.categoryId, (totals.get(item.categoryId) ?? 0) + item.amount);
    });

  return [...totals.entries()]
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((a, b) => b.total - a.total);
}
