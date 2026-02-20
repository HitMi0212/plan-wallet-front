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

export type AssetFlowType = 'SAVINGS' | 'INVEST';
export type AssetFlowCurrency = 'KRW' | 'USD';
export type AssetFlowRecordKind = 'DEPOSIT' | 'PNL';

export interface AssetFlowRecord {
  id: number;
  kind?: AssetFlowRecordKind;
  amount: number;
  fxRate?: number;
  occurredAt: string;
  memo: string | null;
  transactionId?: number;
}

export interface AssetFlowAccount {
  id: number;
  type: AssetFlowType;
  currency?: AssetFlowCurrency;
  bankName: string;
  productName: string;
  records: AssetFlowRecord[];
  createdAt: string;
  updatedAt: string;
}

interface LocalAssetFlowAccount extends AssetFlowAccount {
  userId: number;
}

export const USERS_KEY = 'plan-wallet.local.users';
export const CATEGORIES_KEY = 'plan-wallet.local.categories';
export const TRANSACTIONS_KEY = 'plan-wallet.local.transactions';
export const ASSET_FLOWS_KEY = 'plan-wallet.local.asset_flows';

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
  return {
    ...category,
    expenseKind: category.type === 'EXPENSE' ? category.expenseKind ?? 'NORMAL' : 'NORMAL',
  };
}

function toPublicTransaction(item: LocalTransaction): Transaction {
  const { userId, ...transaction } = item;
  return transaction;
}

function toPublicAssetFlowAccount(item: LocalAssetFlowAccount): AssetFlowAccount {
  const { userId, ...account } = item;
  return {
    ...account,
    currency: account.currency ?? 'KRW',
    records: account.records.map((record) => ({
      ...record,
      kind: record.kind ?? 'DEPOSIT',
      fxRate: record.fxRate,
    })),
  };
}

function ensureAssetFlowRecordKind(record: AssetFlowRecord): AssetFlowRecordKind {
  return record.kind ?? 'DEPOSIT';
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
  if (!userId) return 0;
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
    expenseKind: payload.type === 'EXPENSE' ? payload.expenseKind ?? 'NORMAL' : 'NORMAL',
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
  if (target.type === 'EXPENSE') {
    target.expenseKind = payload.expenseKind ?? target.expenseKind ?? 'NORMAL';
  } else {
    target.expenseKind = 'NORMAL';
  }
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

export async function getLocalAssetFlowAccounts(userId: number): Promise<AssetFlowAccount[]> {
  const items = await readList<LocalAssetFlowAccount>(ASSET_FLOWS_KEY);
  let changed = false;
  const normalized = items.map((item) => {
    if (!item.currency) {
      changed = true;
      return { ...item, currency: 'KRW' as AssetFlowCurrency };
    }
    return item;
  });
  if (changed) {
    await writeList(ASSET_FLOWS_KEY, normalized);
  }
  return normalized.filter((item) => item.userId === userId).map(toPublicAssetFlowAccount);
}

export async function getLocalAssetFlowLinkedTransactionIds(userId: number): Promise<number[]> {
  const accounts = await getLocalAssetFlowAccounts(userId);
  const ids = new Set<number>();
  accounts.forEach((account) => {
    account.records.forEach((record) => {
      if (typeof record.transactionId === 'number') {
        ids.add(record.transactionId);
      }
    });
  });
  return [...ids];
}

export async function getLocalAssetFlowDepositTransactionIds(userId: number): Promise<number[]> {
  const accounts = await getLocalAssetFlowAccounts(userId);
  const ids = new Set<number>();
  accounts.forEach((account) => {
    account.records.forEach((record) => {
      const kind = ensureAssetFlowRecordKind(record);
      if (kind === 'DEPOSIT' && typeof record.transactionId === 'number') {
        ids.add(record.transactionId);
      }
    });
  });
  return [...ids];
}

function findOrCreateAssetFlowCategory(
  userId: number,
  categories: LocalCategory[],
  option: {
    type: Category['type'];
    expenseKind: Category['expenseKind'];
    name: string;
    timestamp: string;
  }
) {
  let category = categories.find(
    (item) =>
      item.userId === userId &&
      item.type === option.type &&
      item.name === option.name &&
      (item.expenseKind ?? 'NORMAL') === option.expenseKind
  );
  if (!category) {
    category = {
      id: nextId(categories),
      userId,
      type: option.type,
      expenseKind: option.expenseKind,
      name: option.name,
      createdAt: option.timestamp,
      updatedAt: option.timestamp,
    };
    categories.push(category);
  }
  return category;
}

function resolveAssetFlowRecordToTransaction(
  userId: number,
  account: Pick<AssetFlowAccount, 'type' | 'currency' | 'bankName' | 'productName'>,
  record: AssetFlowRecord,
  categories: LocalCategory[],
  timestamp: string
) {
  const kind = ensureAssetFlowRecordKind(record);
  const trimmedMemo = record.memo?.trim() || null;
  const isUsdInvest = account.type === 'INVEST' && account.currency === 'USD';
  const toKrwAmount = (value: number) => {
    if (!isUsdInvest) return Math.abs(value);
    const rate = record.fxRate ?? 1;
    return Math.trunc(Math.abs(value) * rate);
  };

  if (kind === 'PNL' && account.type === 'INVEST') {
    if (record.amount >= 0) {
      const incomeCategory = findOrCreateAssetFlowCategory(userId, categories, {
        type: 'INCOME',
        expenseKind: 'NORMAL',
        name: '투자 수익',
        timestamp,
      });
      return {
        type: 'INCOME' as const,
        amount: toKrwAmount(record.amount),
        categoryId: incomeCategory.id,
        memo: trimmedMemo,
      };
    }
    const lossCategory = findOrCreateAssetFlowCategory(userId, categories, {
      type: 'EXPENSE',
      expenseKind: 'INVEST',
      name: '투자 손실',
      timestamp,
    });
    return {
      type: 'EXPENSE' as const,
      amount: toKrwAmount(record.amount),
      categoryId: lossCategory.id,
      memo: trimmedMemo,
    };
  }

  const expenseKind = account.type === 'SAVINGS' ? 'SAVINGS' : 'INVEST';
  const expenseCategory = findOrCreateAssetFlowCategory(userId, categories, {
    type: 'EXPENSE',
    expenseKind,
    name: account.type === 'SAVINGS' ? '예적금' : '투자',
    timestamp,
  });

  return {
    type: 'EXPENSE' as const,
    amount: toKrwAmount(record.amount),
    categoryId: expenseCategory.id,
    memo: trimmedMemo,
  };
}

export async function createLocalAssetFlowAccount(
  userId: number,
  payload: {
    type: AssetFlowType;
    currency?: AssetFlowCurrency;
    bankName: string;
    productName?: string;
    amount: number;
    fxRate?: number;
    occurredAt: string;
    memo?: string | null;
  }
): Promise<AssetFlowAccount> {
  const items = await readList<LocalAssetFlowAccount>(ASSET_FLOWS_KEY);
  const categories = await readList<LocalCategory>(CATEGORIES_KEY);
  const transactions = await readList<LocalTransaction>(TRANSACTIONS_KEY);
  const timestamp = nowIso();
  const transactionId = nextId(transactions);

  const created: LocalAssetFlowAccount = {
    id: nextId(items),
    userId,
    type: payload.type,
    currency: payload.type === 'INVEST' ? payload.currency ?? 'KRW' : 'KRW',
    bankName: payload.bankName.trim(),
    productName: payload.productName?.trim() ?? '',
    records: [
      {
        id: 1,
        kind: 'DEPOSIT',
        amount: payload.amount,
        fxRate: payload.fxRate,
        occurredAt: payload.occurredAt,
        memo: payload.memo?.trim() || null,
        transactionId,
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  items.push(created);
  const mapped = resolveAssetFlowRecordToTransaction(userId, created, created.records[0], categories, timestamp);

  transactions.push({
    id: transactionId,
    userId,
    type: mapped.type,
    amount: mapped.amount,
    categoryId: mapped.categoryId,
    memo: mapped.memo,
    occurredAt: payload.occurredAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await writeList(ASSET_FLOWS_KEY, items);
  await writeList(CATEGORIES_KEY, categories);
  await writeList(TRANSACTIONS_KEY, transactions);
  return toPublicAssetFlowAccount(created);
}

export async function addLocalAssetFlowRecord(
  userId: number,
  accountId: number,
  payload: {
    kind?: AssetFlowRecordKind;
    amount: number;
    fxRate?: number;
    occurredAt: string;
    memo?: string | null;
  }
): Promise<AssetFlowAccount> {
  const items = await readList<LocalAssetFlowAccount>(ASSET_FLOWS_KEY);
  const categories = await readList<LocalCategory>(CATEGORIES_KEY);
  const transactions = await readList<LocalTransaction>(TRANSACTIONS_KEY);
  const target = items.find((item) => item.userId === userId && item.id === accountId);
  if (!target) {
    throw new Error('ASSET_ACCOUNT_NOT_FOUND');
  }

  const nextRecordId = nextId(target.records);
  const transactionId = nextId(transactions);
  const createdRecord: AssetFlowRecord = {
    id: nextRecordId,
    kind: payload.kind ?? 'DEPOSIT',
    amount: payload.amount,
    fxRate: payload.fxRate,
    occurredAt: payload.occurredAt,
    memo: payload.memo?.trim() || null,
    transactionId,
  };
  target.records.push(createdRecord);
  target.updatedAt = nowIso();

  const mapped = resolveAssetFlowRecordToTransaction(userId, target, createdRecord, categories, target.updatedAt);

  transactions.push({
    id: transactionId,
    userId,
    type: mapped.type,
    amount: mapped.amount,
    categoryId: mapped.categoryId,
    memo: mapped.memo,
    occurredAt: payload.occurredAt,
    createdAt: target.updatedAt,
    updatedAt: target.updatedAt,
  });

  await writeList(ASSET_FLOWS_KEY, items);
  await writeList(CATEGORIES_KEY, categories);
  await writeList(TRANSACTIONS_KEY, transactions);
  return toPublicAssetFlowAccount(target);
}

export async function syncLocalAssetFlowToTransactions(userId: number): Promise<void> {
  const items = await readList<LocalAssetFlowAccount>(ASSET_FLOWS_KEY);
  const categories = await readList<LocalCategory>(CATEGORIES_KEY);
  const transactions = await readList<LocalTransaction>(TRANSACTIONS_KEY);
  let changed = false;

  items
    .filter((account) => account.userId === userId)
    .forEach((account) => {
      account.records.forEach((record) => {
        if (!record.kind) {
          record.kind = 'DEPOSIT';
          changed = true;
        }
        const linked = record.transactionId
          ? transactions.find((txn) => txn.userId === userId && txn.id === record.transactionId)
          : null;
        if (linked) {
          return;
        }
        const createdAt = nowIso();
        const txId = nextId(transactions);
        const mapped = resolveAssetFlowRecordToTransaction(userId, account, record, categories, createdAt);
        transactions.push({
          id: txId,
          userId,
          type: mapped.type,
          amount: mapped.amount,
          categoryId: mapped.categoryId,
          memo: mapped.memo,
          occurredAt: record.occurredAt,
          createdAt,
          updatedAt: createdAt,
        });
        record.transactionId = txId;
        changed = true;
      });
    });

  if (!changed) return;
  await writeList(ASSET_FLOWS_KEY, items);
  await writeList(CATEGORIES_KEY, categories);
  await writeList(TRANSACTIONS_KEY, transactions);
}

export async function updateLocalAssetFlowRecord(
  userId: number,
  accountId: number,
  recordId: number,
  payload: { kind?: AssetFlowRecordKind; amount: number; fxRate?: number; occurredAt: string; memo?: string | null }
): Promise<AssetFlowAccount> {
  const items = await readList<LocalAssetFlowAccount>(ASSET_FLOWS_KEY);
  const categories = await readList<LocalCategory>(CATEGORIES_KEY);
  const transactions = await readList<LocalTransaction>(TRANSACTIONS_KEY);
  const account = items.find((item) => item.userId === userId && item.id === accountId);
  if (!account) throw new Error('ASSET_ACCOUNT_NOT_FOUND');

  const record = account.records.find((item) => item.id === recordId);
  if (!record) throw new Error('ASSET_RECORD_NOT_FOUND');

  record.kind = payload.kind ?? record.kind ?? 'DEPOSIT';
  record.amount = payload.amount;
  record.fxRate = payload.fxRate ?? record.fxRate;
  record.occurredAt = payload.occurredAt;
  record.memo = payload.memo?.trim() || null;
  account.updatedAt = nowIso();
  const mapped = resolveAssetFlowRecordToTransaction(userId, account, record, categories, account.updatedAt);

  let txn = record.transactionId
    ? transactions.find((item) => item.userId === userId && item.id === record.transactionId)
    : null;
  if (!txn) {
    const txId = nextId(transactions);
    txn = {
      id: txId,
      userId,
      type: mapped.type,
      amount: mapped.amount,
      categoryId: mapped.categoryId,
      memo: mapped.memo,
      occurredAt: payload.occurredAt,
      createdAt: account.updatedAt,
      updatedAt: account.updatedAt,
    };
    transactions.push(txn);
    record.transactionId = txId;
  } else {
    txn.type = mapped.type;
    txn.amount = mapped.amount;
    txn.occurredAt = payload.occurredAt;
    txn.categoryId = mapped.categoryId;
    txn.memo = mapped.memo;
    txn.updatedAt = account.updatedAt;
  }

  await writeList(ASSET_FLOWS_KEY, items);
  await writeList(CATEGORIES_KEY, categories);
  await writeList(TRANSACTIONS_KEY, transactions);
  return toPublicAssetFlowAccount(account);
}

export async function deleteLocalAssetFlowRecord(
  userId: number,
  accountId: number,
  recordId: number
): Promise<AssetFlowAccount> {
  const items = await readList<LocalAssetFlowAccount>(ASSET_FLOWS_KEY);
  const transactions = await readList<LocalTransaction>(TRANSACTIONS_KEY);
  const account = items.find((item) => item.userId === userId && item.id === accountId);
  if (!account) throw new Error('ASSET_ACCOUNT_NOT_FOUND');
  const record = account.records.find((item) => item.id === recordId);
  if (!record) throw new Error('ASSET_RECORD_NOT_FOUND');

  account.records = account.records.filter((item) => item.id !== recordId);
  account.updatedAt = nowIso();

  if (record.transactionId) {
    const nextTransactions = transactions.filter(
      (item) => !(item.userId === userId && item.id === record.transactionId)
    );
    await writeList(TRANSACTIONS_KEY, nextTransactions);
  }
  await writeList(ASSET_FLOWS_KEY, items);
  return toPublicAssetFlowAccount(account);
}

export async function updateLocalAssetFlowAccount(
  userId: number,
  accountId: number,
  payload: {
    type: AssetFlowType;
    currency?: AssetFlowCurrency;
    bankName: string;
    productName?: string;
  }
): Promise<AssetFlowAccount> {
  const items = await readList<LocalAssetFlowAccount>(ASSET_FLOWS_KEY);
  const categories = await readList<LocalCategory>(CATEGORIES_KEY);
  const transactions = await readList<LocalTransaction>(TRANSACTIONS_KEY);
  const account = items.find((item) => item.userId === userId && item.id === accountId);
  if (!account) throw new Error('ASSET_ACCOUNT_NOT_FOUND');

  account.type = payload.type;
  account.currency = payload.type === 'INVEST' ? payload.currency ?? account.currency ?? 'KRW' : 'KRW';
  account.bankName = payload.bankName.trim();
  account.productName = payload.productName?.trim() ?? '';
  account.updatedAt = nowIso();

  account.records.forEach((record) => {
    if (!record.transactionId) return;
    const txn = transactions.find((item) => item.userId === userId && item.id === record.transactionId);
    if (!txn) return;
    const mapped = resolveAssetFlowRecordToTransaction(userId, account, record, categories, account.updatedAt);
    txn.type = mapped.type;
    txn.amount = mapped.amount;
    txn.categoryId = mapped.categoryId;
    txn.memo = mapped.memo;
    txn.updatedAt = account.updatedAt;
  });

  await writeList(ASSET_FLOWS_KEY, items);
  await writeList(CATEGORIES_KEY, categories);
  await writeList(TRANSACTIONS_KEY, transactions);
  return toPublicAssetFlowAccount(account);
}

export async function deleteLocalAssetFlowAccount(userId: number, accountId: number): Promise<void> {
  const items = await readList<LocalAssetFlowAccount>(ASSET_FLOWS_KEY);
  const account = items.find((item) => item.userId === userId && item.id === accountId);
  if (!account) throw new Error('ASSET_ACCOUNT_NOT_FOUND');

  const transactions = await readList<LocalTransaction>(TRANSACTIONS_KEY);
  const deleteTxnIdSet = new Set<number>(
    account.records.map((record) => record.transactionId).filter((id): id is number => typeof id === 'number')
  );

  const nextItems = items.filter((item) => !(item.userId === userId && item.id === accountId));
  const nextTransactions = transactions.filter(
    (txn) => !(txn.userId === userId && deleteTxnIdSet.has(txn.id))
  );

  await writeList(ASSET_FLOWS_KEY, nextItems);
  await writeList(TRANSACTIONS_KEY, nextTransactions);
}

export async function seedDemoDataIfEmpty(userId: number): Promise<void> {
  const categories = await readList<LocalCategory>(CATEGORIES_KEY);
  const transactions = await readList<LocalTransaction>(TRANSACTIONS_KEY);

  const userCategories = categories.filter((item) => item.userId === userId);
  const userTransactions = transactions.filter((item) => item.userId === userId);

  if (userCategories.length > 0 || userTransactions.length > 0) {
    return;
  }

  const now = new Date();
  const timestamp = now.toISOString();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let nextCategoryId = nextId(categories);
  const createDemoCategory = (
    type: Category['type'],
    name: string,
    expenseKind: Category['expenseKind']
  ): LocalCategory => {
    const category: LocalCategory = {
      id: nextCategoryId++,
      userId,
      type,
      expenseKind,
      name,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return category;
  };

  const demoCategories: LocalCategory[] = [
    createDemoCategory('INCOME', '월급', 'NORMAL'),
    createDemoCategory('EXPENSE', '식비', 'NORMAL'),
    createDemoCategory('EXPENSE', '교통', 'NORMAL'),
    createDemoCategory('EXPENSE', '적금', 'SAVINGS'),
    createDemoCategory('EXPENSE', '국내주식', 'INVEST'),
  ];

  const incomeCategoryId = demoCategories[0].id;
  const foodCategoryId = demoCategories[1].id;
  const trafficCategoryId = demoCategories[2].id;
  const savingsCategoryId = demoCategories[3].id;
  const investCategoryId = demoCategories[4].id;

  const sampleDates = {
    thisMonthPayday: new Date(currentYear, currentMonth, 1, 9, 0, 0).toISOString(),
    thisMonthFood: new Date(currentYear, currentMonth, 5, 12, 30, 0).toISOString(),
    thisMonthSavings: new Date(currentYear, currentMonth, 10, 10, 0, 0).toISOString(),
    thisMonthInvest: new Date(currentYear, currentMonth, 12, 11, 0, 0).toISOString(),
    thisMonthTraffic: new Date(currentYear, currentMonth, 15, 8, 30, 0).toISOString(),
    prevMonthPayday: new Date(currentYear, currentMonth - 1, 1, 9, 0, 0).toISOString(),
    prevMonthFood: new Date(currentYear, currentMonth - 1, 6, 12, 0, 0).toISOString(),
    prevMonthSavings: new Date(currentYear, currentMonth - 1, 10, 10, 0, 0).toISOString(),
    prevMonthInvest: new Date(currentYear, currentMonth - 1, 12, 11, 0, 0).toISOString(),
  };

  const nextTxnIdBase = nextId(transactions);
  const demoTransactions: LocalTransaction[] = [
    {
      id: nextTxnIdBase,
      userId,
      type: 'INCOME',
      amount: 3200000,
      categoryId: incomeCategoryId,
      memo: '월급',
      occurredAt: sampleDates.thisMonthPayday,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: nextTxnIdBase + 1,
      userId,
      type: 'EXPENSE',
      amount: 18000,
      categoryId: foodCategoryId,
      memo: '점심',
      occurredAt: sampleDates.thisMonthFood,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: nextTxnIdBase + 2,
      userId,
      type: 'EXPENSE',
      amount: 500000,
      categoryId: savingsCategoryId,
      memo: '자동이체',
      occurredAt: sampleDates.thisMonthSavings,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: nextTxnIdBase + 3,
      userId,
      type: 'EXPENSE',
      amount: 300000,
      categoryId: investCategoryId,
      memo: 'ETF 매수',
      occurredAt: sampleDates.thisMonthInvest,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: nextTxnIdBase + 4,
      userId,
      type: 'EXPENSE',
      amount: 2800,
      categoryId: trafficCategoryId,
      memo: '지하철',
      occurredAt: sampleDates.thisMonthTraffic,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: nextTxnIdBase + 5,
      userId,
      type: 'INCOME',
      amount: 3200000,
      categoryId: incomeCategoryId,
      memo: '월급',
      occurredAt: sampleDates.prevMonthPayday,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: nextTxnIdBase + 6,
      userId,
      type: 'EXPENSE',
      amount: 22000,
      categoryId: foodCategoryId,
      memo: '저녁',
      occurredAt: sampleDates.prevMonthFood,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: nextTxnIdBase + 7,
      userId,
      type: 'EXPENSE',
      amount: 500000,
      categoryId: savingsCategoryId,
      memo: '적금',
      occurredAt: sampleDates.prevMonthSavings,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: nextTxnIdBase + 8,
      userId,
      type: 'EXPENSE',
      amount: 250000,
      categoryId: investCategoryId,
      memo: '국내주식 매수',
      occurredAt: sampleDates.prevMonthInvest,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  await writeList(CATEGORIES_KEY, [...categories, ...demoCategories]);
  await writeList(TRANSACTIONS_KEY, [...transactions, ...demoTransactions]);
}

export async function seedDefaultCategoriesIfEmpty(userId: number): Promise<void> {
  const categories = await readList<LocalCategory>(CATEGORIES_KEY);
  const userCategories = categories.filter((item) => item.userId === userId);
  if (userCategories.length > 0) {
    return;
  }

  const timestamp = new Date().toISOString();
  let nextCategoryId = nextId(categories);

  const createDefaultCategory = (
    type: Category['type'],
    name: string,
    expenseKind: Category['expenseKind']
  ): LocalCategory => ({
    id: nextCategoryId++,
    userId,
    type,
    expenseKind,
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const defaultCategories: LocalCategory[] = [
    createDefaultCategory('INCOME', '월급', 'NORMAL'),
    createDefaultCategory('EXPENSE', '식비', 'NORMAL'),
    createDefaultCategory('EXPENSE', '교통', 'NORMAL'),
    createDefaultCategory('EXPENSE', '적금', 'SAVINGS'),
    createDefaultCategory('EXPENSE', '국내주식', 'INVEST'),
  ];

  await writeList(CATEGORIES_KEY, [...categories, ...defaultCategories]);
}
