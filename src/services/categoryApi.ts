export type CategoryType = 'INCOME' | 'EXPENSE';

export interface Category {
  id: number;
  type: CategoryType;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryCreateRequest {
  type: CategoryType;
  name: string;
}

export interface CategoryUpdateRequest {
  name: string;
}
