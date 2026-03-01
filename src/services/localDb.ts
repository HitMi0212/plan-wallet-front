import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';

import { loadTokens } from './token';
import { Category, CategoryCreateRequest, CategoryUpdateRequest } from './categoryApi';
import {
  PaymentMethod,
  Transaction,
  TransactionCreateRequest,
  TransactionUpdateRequest,
} from './transactionApi';

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

export type RecurringFrequency = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RecurringRule {
  id: number;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  categoryId: number;
  paymentMethod?: PaymentMethod | null;
  memo?: string | null;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  frequency: RecurringFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  monthOfYear?: number;
  lastGeneratedAt?: string | null; // YYYY-MM-DD
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LocalRecurringRule extends RecurringRule {
  userId: number;
}

export interface MonthlyBudget {
  userId: number;
  year: number;
  month: number;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export type AssetFlowType = 'SAVINGS' | 'INVEST';
export type AssetFlowCurrency = 'KRW' | 'USD';
export type AssetFlowRecordKind = 'DEPOSIT' | 'PNL' | 'WITHDRAW' | 'INTEREST';

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
  interestType?: 'SIMPLE' | 'COMPOUND';
  interestRate?: number | null;
  maturityDate?: string | null;
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
export const RECURRING_RULES_KEY = 'plan-wallet.local.recurring_rules';
export const MONTHLY_BUDGETS_KEY = 'plan-wallet.local.monthly_budgets';

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
    interestType: account.interestType ?? 'SIMPLE',
    interestRate: account.interestRate ?? null,
    maturityDate: account.maturityDate ?? null,
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
  const target = categories.find((item) => item.userId === userId && item.id === id);
  if (!target) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  const transactions = await readList<LocalTransaction>(TRANSACTIONS_KEY);
  const nextTransactions = transactions.map((item) => {
    if (item.userId === userId && item.categoryId === id && !item.categoryName) {
      return { ...item, categoryName: target.name };
    }
    return item;
  });
  await writeList(TRANSACTIONS_KEY, nextTransactions);

  const nextCategories = categories.filter((item) => !(item.userId === userId && item.id === id));
  await writeList(CATEGORIES_KEY, nextCategories);
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
  const targetCategory = categories.find(
    (item) => item.userId === userId && item.id === payload.categoryId
  );
  if (!targetCategory) {
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
    categoryName: targetCategory.name,
    memo: payload.memo ?? null,
    paymentMethod: payload.paymentMethod ?? null,
    recurringRuleId: payload.recurringRuleId,
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
  const targetCategory = categories.find(
    (item) => item.userId === userId && item.id === payload.categoryId
  );
  if (!targetCategory) {
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
  target.categoryName = targetCategory.name;
  target.memo = payload.memo ?? null;
  target.paymentMethod = payload.paymentMethod !== undefined ? payload.paymentMethod : target.paymentMethod ?? null;
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

function parseDateInput(value: string) {
  return dayjs(value, 'YYYY-MM-DD').startOf('day');
}

function formatDateInput(value: dayjs.Dayjs) {
  return value.format('YYYY-MM-DD');
}

function resolveRecurringDayOfMonth(rule: RecurringRule, date: dayjs.Dayjs) {
  const baseDay = rule.dayOfMonth ?? parseDateInput(rule.startDate).date();
  return Math.min(baseDay, date.daysInMonth());
}

function matchesRecurringRule(rule: RecurringRule, date: dayjs.Dayjs) {
  if (rule.frequency === 'WEEKLY') {
    const dayOfWeek = rule.dayOfWeek ?? parseDateInput(rule.startDate).day();
    return date.day() === dayOfWeek;
  }
  if (rule.frequency === 'MONTHLY') {
    return date.date() === resolveRecurringDayOfMonth(rule, date);
  }
  const monthOfYear = rule.monthOfYear ?? parseDateInput(rule.startDate).month() + 1;
  if (date.month() + 1 !== monthOfYear) return false;
  return date.date() === resolveRecurringDayOfMonth(rule, date);
}

export async function getLocalRecurringRules(userId: number): Promise<RecurringRule[]> {
  const items = await readList<LocalRecurringRule>(RECURRING_RULES_KEY);
  return items.filter((item) => item.userId === userId);
}

export async function createLocalRecurringRule(
  userId: number,
  payload: Omit<RecurringRule, 'id' | 'createdAt' | 'updatedAt' | 'lastGeneratedAt' | 'isActive'>
): Promise<RecurringRule> {
  const items = await readList<LocalRecurringRule>(RECURRING_RULES_KEY);
  const timestamp = nowIso();
  const created: LocalRecurringRule = {
    ...payload,
    id: nextId(items),
    userId,
    lastGeneratedAt: null,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  items.push(created);
  await writeList(RECURRING_RULES_KEY, items);
  return created;
}

export async function updateLocalRecurringRule(
  userId: number,
  id: number,
  payload: Partial<Pick<RecurringRule, 'isActive' | 'endDate' | 'amount' | 'memo' | 'paymentMethod'>>
): Promise<RecurringRule> {
  const items = await readList<LocalRecurringRule>(RECURRING_RULES_KEY);
  const target = items.find((item) => item.userId === userId && item.id === id);
  if (!target) {
    throw new Error('RECURRING_RULE_NOT_FOUND');
  }

  if (typeof payload.isActive === 'boolean') target.isActive = payload.isActive;
  if (typeof payload.endDate === 'string' || payload.endDate === null) target.endDate = payload.endDate;
  if (typeof payload.amount === 'number') target.amount = payload.amount;
  if (typeof payload.memo === 'string' || payload.memo === null) target.memo = payload.memo;
  if (payload.paymentMethod !== undefined) target.paymentMethod = payload.paymentMethod;
  target.updatedAt = nowIso();
  await writeList(RECURRING_RULES_KEY, items);
  return target;
}

export async function deleteLocalRecurringRule(userId: number, id: number): Promise<void> {
  const items = await readList<LocalRecurringRule>(RECURRING_RULES_KEY);
  const next = items.filter((item) => !(item.userId === userId && item.id === id));
  await writeList(RECURRING_RULES_KEY, next);
}

export async function syncLocalRecurringToTransactions(userId: number): Promise<void> {
  const rules = await readList<LocalRecurringRule>(RECURRING_RULES_KEY);
  const categories = await readList<LocalCategory>(CATEGORIES_KEY);
  const transactions = await readList<LocalTransaction>(TRANSACTIONS_KEY);
  const today = dayjs().startOf('day');

  let changed = false;
  const existingGenerated = new Set<string>();
  transactions.forEach((item) => {
    if (!item.recurringRuleId) return;
    const key = `${item.recurringRuleId}:${dayjs(item.occurredAt).format('YYYY-MM-DD')}`;
    existingGenerated.add(key);
  });

  rules
    .filter((rule) => rule.userId === userId)
    .forEach((rule) => {
      if (!rule.isActive) return;
      const targetCategory = categories.find((item) => item.userId === userId && item.id === rule.categoryId);
      if (!targetCategory) return;

      const start = parseDateInput(rule.startDate);
      const end = rule.endDate ? parseDateInput(rule.endDate) : null;
      const lastGenerated = rule.lastGeneratedAt ? parseDateInput(rule.lastGeneratedAt) : null;
      let from = lastGenerated ? lastGenerated.add(1, 'day') : start;

      if (from.isAfter(today)) return;
      const to = end && end.isBefore(today) ? end : today;

      let cursor = from.startOf('day');
      let steps = 0;
      const maxSteps = 800;
      while ((cursor.isBefore(to) || cursor.isSame(to, 'day')) && steps < maxSteps) {
        if (cursor.isAfter(start) || cursor.isSame(start, 'day')) {
          if (!end || cursor.isBefore(end) || cursor.isSame(end, 'day')) {
            if (matchesRecurringRule(rule, cursor)) {
              const dateKey = formatDateInput(cursor);
              const key = `${rule.id}:${dateKey}`;
              if (!existingGenerated.has(key)) {
                const timestamp = nowIso();
                transactions.push({
                  id: nextId(transactions),
                  userId,
                  type: rule.type,
                  amount: rule.amount,
                  categoryId: rule.categoryId,
                  categoryName: targetCategory.name,
                  memo: rule.memo ?? null,
                  paymentMethod: rule.paymentMethod ?? null,
                  recurringRuleId: rule.id,
                  occurredAt: cursor.hour(12).minute(0).second(0).millisecond(0).toISOString(),
                  createdAt: timestamp,
                  updatedAt: timestamp,
                });
                existingGenerated.add(key);
                changed = true;
              }
            }
          }
        }
        cursor = cursor.add(1, 'day');
        steps += 1;
      }

      const last = formatDateInput(to);
      if (rule.lastGeneratedAt !== last) {
        rule.lastGeneratedAt = last;
        rule.updatedAt = nowIso();
        changed = true;
      }
    });

  if (changed) {
    await writeList(TRANSACTIONS_KEY, transactions);
    await writeList(RECURRING_RULES_KEY, rules);
  }
}

export async function getLocalMonthlyBudget(userId: number, year: number, month: number): Promise<MonthlyBudget | null> {
  const items = await readList<MonthlyBudget>(MONTHLY_BUDGETS_KEY);
  return items.find((item) => item.userId === userId && item.year === year && item.month === month) ?? null;
}

export async function setLocalMonthlyBudget(userId: number, year: number, month: number, amount: number): Promise<MonthlyBudget> {
  const items = await readList<MonthlyBudget>(MONTHLY_BUDGETS_KEY);
  const target = items.find((item) => item.userId === userId && item.year === year && item.month === month);
  const timestamp = nowIso();
  if (target) {
    target.amount = amount;
    target.updatedAt = timestamp;
    await writeList(MONTHLY_BUDGETS_KEY, items);
    return target;
  }

  const created: MonthlyBudget = {
    userId,
    year,
    month,
    amount,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  items.push(created);
  await writeList(MONTHLY_BUDGETS_KEY, items);
  return created;
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

function findAssetFlowCategory(
  userId: number,
  categories: LocalCategory[],
  option: {
    type: Category['type'];
    expenseKind: Category['expenseKind'];
    name: string;
  }
) {
  return categories.find(
    (item) =>
      item.userId === userId &&
      item.type === option.type &&
      item.name === option.name &&
      (item.expenseKind ?? 'NORMAL') === option.expenseKind
  );
}

function resolveAssetFlowRecordToTransaction(
  userId: number,
  account: Pick<AssetFlowAccount, 'type' | 'currency' | 'bankName' | 'productName'>,
  record: AssetFlowRecord,
  categories: LocalCategory[]
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
      const incomeCategory = findAssetFlowCategory(userId, categories, {
        type: 'INCOME',
        expenseKind: 'NORMAL',
        name: '투자 수익',
      });
      return {
        type: 'INCOME' as const,
        amount: toKrwAmount(record.amount),
        categoryId: incomeCategory?.id ?? 0,
        categoryName: '투자 수익',
        memo: trimmedMemo,
      };
    }
    const lossCategory = findAssetFlowCategory(userId, categories, {
      type: 'EXPENSE',
      expenseKind: 'INVEST',
      name: '투자 손실',
    });
    return {
      type: 'EXPENSE' as const,
      amount: toKrwAmount(record.amount),
      categoryId: lossCategory?.id ?? 0,
      categoryName: '투자 손실',
      memo: trimmedMemo,
    };
  }

  if (kind === 'INTEREST') {
    const incomeName = account.type === 'SAVINGS' ? '예적금 이자' : '투자 수익';
    const incomeCategory = findAssetFlowCategory(userId, categories, {
      type: 'INCOME',
      expenseKind: 'NORMAL',
      name: incomeName,
    });
    return {
      type: 'INCOME' as const,
      amount: toKrwAmount(record.amount),
      categoryId: incomeCategory?.id ?? 0,
      categoryName: incomeName,
      memo: trimmedMemo,
    };
  }

  if (kind === 'WITHDRAW') {
    const incomeName = account.type === 'SAVINGS' ? '예적금 인출' : '투자 인출';
    const incomeCategory = findAssetFlowCategory(userId, categories, {
      type: 'INCOME',
      expenseKind: 'NORMAL',
      name: incomeName,
    });
    return {
      type: 'INCOME' as const,
      amount: toKrwAmount(record.amount),
      categoryId: incomeCategory?.id ?? 0,
      categoryName: incomeName,
      memo: trimmedMemo,
    };
  }

  const expenseKind = account.type === 'SAVINGS' ? 'SAVINGS' : 'INVEST';
  const expenseCategory = findAssetFlowCategory(userId, categories, {
    type: 'EXPENSE',
    expenseKind,
    name: account.type === 'SAVINGS' ? '예적금' : '투자',
  });

  return {
    type: 'EXPENSE' as const,
    amount: toKrwAmount(record.amount),
    categoryId: expenseCategory?.id ?? 0,
    categoryName: account.type === 'SAVINGS' ? '예적금' : '투자',
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
    interestType: 'SIMPLE',
    interestRate: null,
    maturityDate: null,
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
  const mapped = resolveAssetFlowRecordToTransaction(userId, created, created.records[0], categories);

  transactions.push({
    id: transactionId,
    userId,
    type: mapped.type,
    amount: mapped.amount,
    categoryId: mapped.categoryId,
    categoryName: mapped.categoryName,
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

  const mapped = resolveAssetFlowRecordToTransaction(userId, target, createdRecord, categories);

  transactions.push({
    id: transactionId,
    userId,
    type: mapped.type,
    amount: mapped.amount,
    categoryId: mapped.categoryId,
    categoryName: mapped.categoryName,
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
          const mapped = resolveAssetFlowRecordToTransaction(userId, account, record, categories);
          if (linked.type !== mapped.type) linked.type = mapped.type;
          if (linked.amount !== mapped.amount) linked.amount = mapped.amount;
          if (linked.categoryId !== mapped.categoryId) linked.categoryId = mapped.categoryId;
          if (mapped.categoryName && linked.categoryName !== mapped.categoryName) linked.categoryName = mapped.categoryName;
          if (linked.memo !== mapped.memo) linked.memo = mapped.memo;
          if (linked.occurredAt !== record.occurredAt) linked.occurredAt = record.occurredAt;
          linked.updatedAt = nowIso();
          changed = true;
          return;
        }
        const createdAt = nowIso();
        const txId = nextId(transactions);
        const mapped = resolveAssetFlowRecordToTransaction(userId, account, record, categories);
        transactions.push({
          id: txId,
          userId,
          type: mapped.type,
          amount: mapped.amount,
          categoryId: mapped.categoryId,
          categoryName: mapped.categoryName,
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
  const mapped = resolveAssetFlowRecordToTransaction(userId, account, record, categories);

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
      categoryName: mapped.categoryName,
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
    interestType?: 'SIMPLE' | 'COMPOUND';
    interestRate?: number | null;
    maturityDate?: string | null;
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
  if (payload.interestType) account.interestType = payload.interestType;
  if (payload.interestRate !== undefined) account.interestRate = payload.interestRate;
  if (payload.maturityDate !== undefined) account.maturityDate = payload.maturityDate;
  account.updatedAt = nowIso();

  account.records.forEach((record) => {
    if (!record.transactionId) return;
    const txn = transactions.find((item) => item.userId === userId && item.id === record.transactionId);
    if (!txn) return;
    const mapped = resolveAssetFlowRecordToTransaction(userId, account, record, categories);
  txn.type = mapped.type;
  txn.amount = mapped.amount;
  txn.categoryId = mapped.categoryId;
  txn.categoryName = mapped.categoryName;
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
