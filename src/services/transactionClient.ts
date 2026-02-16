import {
  Transaction,
  TransactionCreateRequest,
  TransactionUpdateRequest,
} from './transactionApi';
import {
  createLocalTransaction,
  deleteLocalTransaction,
  getLocalTransactions,
  requireAuthenticatedUserId,
  updateLocalTransaction,
} from './localDb';

export async function fetchTransactions(): Promise<Transaction[]> {
  const userId = await requireAuthenticatedUserId();
  return getLocalTransactions(userId);
}

export async function createTransaction(payload: TransactionCreateRequest): Promise<Transaction> {
  const userId = await requireAuthenticatedUserId();
  return createLocalTransaction(userId, payload);
}

export async function updateTransaction(
  id: number,
  payload: TransactionUpdateRequest
): Promise<Transaction> {
  const userId = await requireAuthenticatedUserId();
  return updateLocalTransaction(userId, id, payload);
}

export async function deleteTransaction(id: number): Promise<void> {
  const userId = await requireAuthenticatedUserId();
  await deleteLocalTransaction(userId, id);
}
