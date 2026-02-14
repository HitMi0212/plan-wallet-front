export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  categoryId: number;
  memo?: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionCreateRequest {
  type: TransactionType;
  amount: number;
  categoryId: number;
  memo?: string | null;
  occurredAt: string;
}

export interface TransactionUpdateRequest {
  type: TransactionType;
  amount: number;
  categoryId: number;
  memo?: string | null;
  occurredAt: string;
}
