import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import dayjs from 'dayjs';

import { getLocalCategories, getLocalTransactions, requireAuthenticatedUserId } from './localDb';
import { PaymentMethod, TransactionType } from './transactionApi';

interface ExportResult {
  fileName: string;
}

function escapeCsv(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function paymentMethodLabel(method?: PaymentMethod | null) {
  if (method === 'CREDIT') return '신용카드';
  if (method === 'DEBIT') return '체크카드';
  if (method === 'CASH') return '현금';
  return '미분류';
}

function typeLabel(type: TransactionType) {
  return type === 'INCOME' ? '수입' : '지출';
}

function timestampForFileName() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
}

export async function exportTransactionCsv(): Promise<ExportResult> {
  const userId = await requireAuthenticatedUserId();
  const [transactions, categories] = await Promise.all([
    getLocalTransactions(userId),
    getLocalCategories(userId),
  ]);

  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));

  const header = ['발생일', '유형', '카테고리', '금액', '결제수단', '메모'].join(',');
  const rows = transactions
    .slice()
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .map((item) => {
      const date = dayjs(item.occurredAt).format('YYYY-MM-DD');
      const categoryName = item.categoryName ?? categoryMap.get(item.categoryId) ?? `카테고리 ${item.categoryId}`;
      const memo = item.memo ?? '';
      const values = [
        date,
        typeLabel(item.type),
        categoryName,
        String(item.amount),
        paymentMethodLabel(item.paymentMethod),
        memo,
      ].map(escapeCsv);
      return values.join(',');
    });

  const csv = [header, ...rows].join('\n');
  const fileName = `plan-wallet-transactions-${timestampForFileName()}.csv`;
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

  if (!baseDir) {
    throw new Error('NO_WRITABLE_DIRECTORY');
  }

  const fileUri = `${baseDir}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'plan-wallet CSV 내보내기',
      UTI: 'public.comma-separated-values-text',
    });
  }

  return { fileName };
}
