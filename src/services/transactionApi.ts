export type TransactionType = 'INCOME' | 'EXPENSE';

export type PaymentMethod = 'CREDIT' | 'DEBIT' | 'CASH';

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  categoryId: number;
  categoryName?: string;
  memo?: string | null;
  paymentMethod?: PaymentMethod | null;
  includeInBudget?: boolean;
  recurringRuleId?: number;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionCreateRequest {
  type: TransactionType;
  amount: number;
  categoryId: number;
  memo?: string | null;
  paymentMethod?: PaymentMethod | null;
  includeInBudget?: boolean;
  recurringRuleId?: number;
  occurredAt: string;
}

export interface TransactionUpdateRequest {
  type: TransactionType;
  amount: number;
  categoryId: number;
  memo?: string | null;
  paymentMethod?: PaymentMethod | null;
  includeInBudget?: boolean;
  recurringRuleId?: number | null;
  occurredAt: string;
}
