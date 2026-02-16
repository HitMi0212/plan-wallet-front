import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { CATEGORIES_KEY, TRANSACTIONS_KEY, USERS_KEY } from './localDb';
import { ACCESS_KEY, REFRESH_KEY } from './token';

const BACKUP_VERSION = 1;

interface BackupPayload {
  version: 1;
  exportedAt: string;
  data: {
    users: unknown[];
    categories: unknown[];
    transactions: unknown[];
    tokens: {
      accessToken: string | null;
      refreshToken: string | null;
    };
  };
}

interface ExportResult {
  fileName: string;
}

interface ImportCancelledResult {
  status: 'cancelled';
}

interface ImportSuccessResult {
  status: 'success';
  counts: {
    users: number;
    categories: number;
    transactions: number;
  };
}

export type ImportResult = ImportCancelledResult | ImportSuccessResult;

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function timestampForFileName() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
}

async function createBackupPayload(): Promise<BackupPayload> {
  const entries = await AsyncStorage.multiGet([
    USERS_KEY,
    CATEGORIES_KEY,
    TRANSACTIONS_KEY,
    ACCESS_KEY,
    REFRESH_KEY,
  ]);
  const map = new Map(entries);

  const users = asArray(JSON.parse(map.get(USERS_KEY) ?? '[]'));
  const categories = asArray(JSON.parse(map.get(CATEGORIES_KEY) ?? '[]'));
  const transactions = asArray(JSON.parse(map.get(TRANSACTIONS_KEY) ?? '[]'));

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      users,
      categories,
      transactions,
      tokens: {
        accessToken: map.get(ACCESS_KEY) ?? null,
        refreshToken: map.get(REFRESH_KEY) ?? null,
      },
    },
  };
}

export async function exportBackupFile(): Promise<ExportResult> {
  const payload = await createBackupPayload();
  const fileName = `plan-wallet-backup-${timestampForFileName()}.json`;
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

  if (!baseDir) {
    throw new Error('NO_WRITABLE_DIRECTORY');
  }

  const fileUri = `${baseDir}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'plan-wallet 백업 파일 저장',
      UTI: 'public.json',
    });
  }

  return { fileName };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertRecordArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`INVALID_${field.toUpperCase()}_ARRAY`);
  }

  const everyRecord = value.every((item) => isRecord(item));
  if (!everyRecord) {
    throw new Error(`INVALID_${field.toUpperCase()}_ITEM`);
  }

  return value;
}

function readBackupData(parsed: unknown): BackupPayload['data'] {
  if (!isRecord(parsed)) {
    throw new Error('INVALID_BACKUP_ROOT');
  }

  const version = parsed.version;
  if (version !== BACKUP_VERSION) {
    throw new Error('UNSUPPORTED_BACKUP_VERSION');
  }

  if (typeof parsed.exportedAt !== 'string') {
    throw new Error('INVALID_EXPORTED_AT');
  }

  if (!isRecord(parsed.data)) {
    throw new Error('INVALID_BACKUP_DATA');
  }

  const users = assertRecordArray(parsed.data.users, 'users');
  const categories = assertRecordArray(parsed.data.categories, 'categories');
  const transactions = assertRecordArray(parsed.data.transactions, 'transactions');

  const tokens = isRecord(parsed.data.tokens) ? parsed.data.tokens : {};
  const accessToken = typeof tokens.accessToken === 'string' ? tokens.accessToken : null;
  const refreshToken = typeof tokens.refreshToken === 'string' ? tokens.refreshToken : null;

  return {
    users,
    categories,
    transactions,
    tokens: { accessToken, refreshToken },
  };
}

export async function importBackupFile(): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (picked.canceled || !picked.assets?.length) {
    return { status: 'cancelled' };
  }

  const asset = picked.assets[0];
  const raw = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('INVALID_JSON');
  }

  const data = readBackupData(parsed);

  await AsyncStorage.multiSet([
    [USERS_KEY, JSON.stringify(data.users)],
    [CATEGORIES_KEY, JSON.stringify(data.categories)],
    [TRANSACTIONS_KEY, JSON.stringify(data.transactions)],
  ]);

  if (data.tokens.accessToken && data.tokens.refreshToken) {
    await AsyncStorage.multiSet([
      [ACCESS_KEY, data.tokens.accessToken],
      [REFRESH_KEY, data.tokens.refreshToken],
    ]);
  } else {
    await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
  }

  return {
    status: 'success',
    counts: {
      users: data.users.length,
      categories: data.categories.length,
      transactions: data.transactions.length,
    },
  };
}
