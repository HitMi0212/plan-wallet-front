import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_KEY = 'plan-wallet.accessToken';
const REFRESH_KEY = 'plan-wallet.refreshToken';

export async function saveTokens(accessToken: string, refreshToken: string) {
  await AsyncStorage.multiSet([
    [ACCESS_KEY, accessToken],
    [REFRESH_KEY, refreshToken],
  ]);
}

export async function loadTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const entries = await AsyncStorage.multiGet([ACCESS_KEY, REFRESH_KEY]);
  const map = new Map(entries);
  return {
    accessToken: map.get(ACCESS_KEY) ?? null,
    refreshToken: map.get(REFRESH_KEY) ?? null,
  };
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}
