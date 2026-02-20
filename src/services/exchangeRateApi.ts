import dayjs from 'dayjs';

const EXIM_BASE_URL = 'https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON';
const EXIM_AUTH_KEY =
  process.env.EXPO_PUBLIC_KOREAEXIM_AUTH_KEY || 'iH06kXB21XH9BYlfKzetf59EMYyn2BfA';

type EximRateRow = {
  cur_unit?: string;
  deal_bas_r?: string;
  result?: number;
};

function parseRateNumber(value?: string) {
  if (!value) return null;
  const normalized = value.replace(/,/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchUsdKrwRate(): Promise<number> {
  for (let back = 0; back < 7; back += 1) {
    const searchDate = dayjs().subtract(back, 'day').format('YYYYMMDD');
    const params = new URLSearchParams({
      authkey: EXIM_AUTH_KEY,
      searchdate: searchDate,
      data: 'AP01',
    });

    const response = await fetch(`${EXIM_BASE_URL}?${params.toString()}`);
    if (!response.ok) {
      continue;
    }

    const data = (await response.json()) as EximRateRow[] | { result?: number };
    if (!Array.isArray(data)) {
      continue;
    }

    const usdItem = data.find((row) => row.cur_unit === 'USD');
    const rate = parseRateNumber(usdItem?.deal_bas_r);
    if (rate) {
      return rate;
    }
  }

  throw new Error('EXCHANGE_RATE_UNAVAILABLE');
}
