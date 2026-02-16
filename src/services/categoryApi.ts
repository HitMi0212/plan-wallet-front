export type CategoryType = 'INCOME' | 'EXPENSE';
export type ExpenseCategoryKind = 'NORMAL' | 'SAVINGS' | 'INVEST';

export interface Category {
  id: number;
  type: CategoryType;
  expenseKind?: ExpenseCategoryKind;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryCreateRequest {
  type: CategoryType;
  expenseKind?: ExpenseCategoryKind;
  name: string;
}

export interface CategoryUpdateRequest {
  name: string;
  expenseKind?: ExpenseCategoryKind;
}
