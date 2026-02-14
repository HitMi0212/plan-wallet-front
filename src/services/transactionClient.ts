import { getApiClient } from './api';
import {
  Transaction,
  TransactionCreateRequest,
  TransactionUpdateRequest,
} from './transactionApi';

const client = () => getApiClient();

export async function fetchTransactions(): Promise<Transaction[]> {
  const response = await client().get('/transactions');
  return response.data as Transaction[];
}

export async function createTransaction(payload: TransactionCreateRequest): Promise<Transaction> {
  const response = await client().post('/transactions', payload);
  return response.data as Transaction;
}

export async function updateTransaction(
  id: number,
  payload: TransactionUpdateRequest
): Promise<Transaction> {
  const response = await client().patch(`/transactions/${id}`, payload);
  return response.data as Transaction;
}

export async function deleteTransaction(id: number): Promise<void> {
  await client().delete(`/transactions/${id}`);
}
