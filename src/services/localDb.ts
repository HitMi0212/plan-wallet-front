import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadTokens } from './token';
import { Category, CategoryCreateRequest, CategoryUpdateRequest } from './categoryApi';
import { Transaction, TransactionCreateRequest, TransactionUpdateRequest } from './transactionApi';

interface LocalUser {
  id: number;
  email: string;
  password: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
}

interface LocalCategory extends Category {
  userId: number;
}

interface LocalTransaction extends Transaction {
  userId: number;
}

export const USERS_KEY = 'plan-wallet.local.users';
export const CATEGORIES_KEY = 'plan-wallet.local.categories';
export const TRANSACTIONS_KEY = 'plan-wallet.local.transactions';

const ACCESS_PREFIX = 'local-access-';
const REFRESH_PREFIX = 'local-refresh-';

function nowIso() {
  return new Date().toISOString();
}

function nextId(items: { id: number }[]) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

async function readList<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeList<T>(key: string, items: T[]) {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

function toPublicCategory(item: LocalCategory): Category {
  const { userId, ...category } = item;
  return category;
}

function toPublicTransaction(item: LocalTransaction): Transaction {
  const { userId, ...transaction } = item;
  return transaction;
}

function parseUserIdFromAccessToken(token: string | null): number | null {
  if (!token || !token.startsWith(ACCESS_PREFIX)) return null;
  const idText = token.slice(ACCESS_PREFIX.length);
  const id = Number(idText);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function requireAuthenticatedUserId(): Promise<number> {
  const { accessToken } = await loadTokens();
  const userId = parseUserIdFromAccessToken(accessToken);
  if (!userId) {
    throw new Error('UNAUTHENTICATED');
  }
  return userId;
}

export async function signUpLocalUser(email: string, password: string, nickname: string): Promise<void> {
  const users = await readList<LocalUser>(USERS_KEY);
  const normalizedEmail = email.trim().toLowerCase();
  const exists = users.some((user) => user.email.toLowerCase() === normalizedEmail);
  if (exists) {
    throw new Error('EMAIL_EXISTS');
  }

  const timestamp = nowIso();
  users.push({
    id: nextId(users),
    email: normalizedEmail,
    password,
    nickname: nickname.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await writeList(USERS_KEY, users);
}

export async function loginLocalUser(
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const users = await readList<LocalUser>(USERS_KEY);
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((item) => item.email.toLowerCase() === normalizedEmail);
  if (!user || user.password !== password) {
    throw new Error('INVALID_CREDENTIALS');
  }

  return {
    accessToken: `${ACCESS_PREFIX}${user.id}`,
    refreshToken: `${REFRESH_PREFIX}${user.id}`,
  };
}

export async function getLocalCategories(userId: number): Promise<Category[]> {
  const items = await readList<LocalCategory>(CATEGORIES_KEY);
  return items.filter((item) => item.userId === userId).map(toPublicCategory);
}

export async function createLocalCategory(
  userId: number,
  payload: CategoryCreateRequest
): Promise<Category> {
  const items = await readList<LocalCategory>(CATEGORIES_KEY);
  const timestamp = nowIso();
  const created: LocalCategory = {
    id: nextId(items),
    userId,
    type: payload.type,
    name: payload.name.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  items.push(created);
  await writeList(CATEGORIES_KEY, items);
  return toPublicCategory(created);
}

export async function updateLocalCategory(
  userId: number,
  id: number,
  payload: CategoryUpdateRequest
): Promise<Category> {
  const items = await readList<LocalCategory>(CATEGORIES_KEY);
  const target = items.find((item) => item.userId === userId && item.id === id);
  if (!target) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  target.name = payload.name.trim();
  target.updatedAt = nowIso();
  await writeList(CATEGORIES_KEY, items);
  return toPublicCategory(target);
}

export async function deleteLocalCategory(userId: number, id: number): Promise<void> {
  const categories = await readList<LocalCategory>(CATEGORIES_KEY);
  const categoryExists = categories.some((item) => item.userId === userId && item.id === id);
  if (!categoryExists) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  const nextCategories = categories.filter((item) => !(item.userId === userId && item.id === id));
  await writeList(CATEGORIES_KEY, nextCategories);

  const transactions = await readList<LocalTransaction>(TRANSACTIONS_KEY);
  const nextTransactions = transactions.filter(
    (item) => !(item.userId === userId && item.categoryId === id)
  );
  await writeList(TRANSACTIONS_KEY, nextTransactions);
}

export async function getLocalTransactions(userId: number): Promise<Transaction[]> {
  const items = await readList<LocalTransaction>(TRANSACTIONS_KEY);
  return items.filter((item) => item.userId === userId).map(toPublicTransaction);
}

export async function createLocalTransaction(
  userId: number,
  payload: TransactionCreateRequest
): Promise<Transaction> {
  const categories = await readList<LocalCategory>(CATEGORIES_KEY);
  const categoryExists = categories.some(
    (item) => item.userId === userId && item.id === payload.categoryId
  );
  if (!categoryExists) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  const transactions = await readList<LocalTransaction>(TRANSACTIONS_KEY);
  const timestamp = nowIso();
  const created: LocalTransaction = {
    id: nextId(transactions),
    userId,
    type: payload.type,
    amount: payload.amount,
    categoryId: payload.categoryId,
    memo: payload.memo ?? null,
    occurredAt: payload.occurredAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  transactions.push(created);
  await writeList(TRANSACTIONS_KEY, transactions);
  return toPublicTransaction(created);
}

export async function updateLocalTransaction(
  userId: number,
  id: number,
  payload: TransactionUpdateRequest
): Promise<Transaction> {
  const categories = await readList<LocalCategory>(CATEGORIES_KEY);
  const categoryExists = categories.some(
    (item) => item.userId === userId && item.id === payload.categoryId
  );
  if (!categoryExists) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  const transactions = await readList<LocalTransaction>(TRANSACTIONS_KEY);
  const target = transactions.find((item) => item.userId === userId && item.id === id);
  if (!target) {
    throw new Error('TRANSACTION_NOT_FOUND');
  }

  target.type = payload.type;
  target.amount = payload.amount;
  target.categoryId = payload.categoryId;
  target.memo = payload.memo ?? null;
  target.occurredAt = payload.occurredAt;
  target.updatedAt = nowIso();
  await writeList(TRANSACTIONS_KEY, transactions);
  return toPublicTransaction(target);
}

export async function deleteLocalTransaction(userId: number, id: number): Promise<void> {
  const transactions = await readList<LocalTransaction>(TRANSACTIONS_KEY);
  const exists = transactions.some((item) => item.userId === userId && item.id === id);
  if (!exists) {
    throw new Error('TRANSACTION_NOT_FOUND');
  }

  const nextTransactions = transactions.filter((item) => !(item.userId === userId && item.id === id));
  await writeList(TRANSACTIONS_KEY, nextTransactions);
}
