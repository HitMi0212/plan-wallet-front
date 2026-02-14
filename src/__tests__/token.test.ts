import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearTokens, loadTokens, saveTokens } from '../services/token';

describe('token service', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('saves and loads tokens', async () => {
    await saveTokens('access', 'refresh');
    const result = await loadTokens();

    expect(result.accessToken).toBe('access');
    expect(result.refreshToken).toBe('refresh');
  });

  it('clears tokens', async () => {
    await saveTokens('access', 'refresh');
    await clearTokens();

    const result = await loadTokens();
    expect(result.accessToken).toBeNull();
    expect(result.refreshToken).toBeNull();
  });
});
