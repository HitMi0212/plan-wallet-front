import dayjs from 'dayjs';

import { getApiClient } from './api';

export interface BannerAd {
  id: string | number;
  placement: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object') return null;
  return value as UnknownRecord;
}

function toBannerAd(value: unknown): BannerAd | null {
  const record = asRecord(value);
  if (!record) return null;
  if (typeof record.title !== 'string' || !record.title.trim()) return null;
  if (typeof record.isActive !== 'boolean') return null;

  const id = record.id;
  if (typeof id !== 'string' && typeof id !== 'number') return null;

  return {
    id,
    placement: typeof record.placement === 'string' ? record.placement : '',
    title: record.title,
    description: typeof record.description === 'string' ? record.description : null,
    imageUrl: typeof record.imageUrl === 'string' ? record.imageUrl : null,
    linkUrl: typeof record.linkUrl === 'string' ? record.linkUrl : null,
    backgroundColor: typeof record.backgroundColor === 'string' ? record.backgroundColor : null,
    textColor: typeof record.textColor === 'string' ? record.textColor : null,
    isActive: record.isActive,
    startAt: typeof record.startAt === 'string' ? record.startAt : null,
    endAt: typeof record.endAt === 'string' ? record.endAt : null,
  };
}

function normalizeBannerResponse(data: unknown): BannerAd | null {
  if (Array.isArray(data)) {
    for (const item of data) {
      const parsed = toBannerAd(item);
      if (parsed) return parsed;
    }
    return null;
  }

  const direct = toBannerAd(data);
  if (direct) return direct;

  const record = asRecord(data);
  if (!record) return null;

  const innerData = toBannerAd(record.data);
  if (innerData) return innerData;

  const item = toBannerAd(record.item);
  if (item) return item;

  const list = record.items;
  if (Array.isArray(list)) {
    for (const entry of list) {
      const parsed = toBannerAd(entry);
      if (parsed) return parsed;
    }
  }

  return null;
}

function isWithinSchedule(ad: BannerAd, now = dayjs()): boolean {
  if (ad.startAt) {
    const startAt = dayjs(ad.startAt);
    if (startAt.isValid() && now.isBefore(startAt)) return false;
  }
  if (ad.endAt) {
    const endAt = dayjs(ad.endAt);
    if (endAt.isValid() && now.isAfter(endAt)) return false;
  }
  return true;
}

export async function fetchHomeBannerAd(): Promise<BannerAd | null> {
  try {
    const response = await getApiClient().get('/ads/banner/home');
    const ad = normalizeBannerResponse(response.data);
    if (!ad) return null;
    if (!ad.isActive) return null;
    if (!isWithinSchedule(ad)) return null;
    return ad;
  } catch {
    return null;
  }
}
