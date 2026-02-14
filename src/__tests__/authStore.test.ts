import { act } from '@testing-library/react-native';

import { useAuthStore } from '../stores/authStore';
import * as tokenService from '../services/token';

jest.mock('../services/api', () => ({
  getApiClient: () => ({
    post: jest.fn((url: string) => {
      if (url === '/auth/login') {
        return Promise.resolve({ data: { accessToken: 'a', refreshToken: 'r' } });
      }
      if (url === '/users') {
        return Promise.resolve({ data: {} });
      }
      return Promise.resolve({ data: {} });
    }),
  }),
}));

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      isHydrated: false,
      isAuthenticated: false,
    });
  });

  it('hydrates from storage', async () => {
    jest.spyOn(tokenService, 'loadTokens').mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
    });

    await act(async () => {
      await useAuthStore.getState().hydrate();
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
  });

  it('logs in and stores tokens', async () => {
    const saveSpy = jest.spyOn(tokenService, 'saveTokens').mockResolvedValue();

    await act(async () => {
      await useAuthStore.getState().login('user@example.com', 'password');
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(saveSpy).toHaveBeenCalled();
  });

  it('signs up then logs in', async () => {
    const saveSpy = jest.spyOn(tokenService, 'saveTokens').mockResolvedValue();

    await act(async () => {
      await useAuthStore.getState().signUp('user@example.com', 'password', 'nick');
    });

    expect(saveSpy).toHaveBeenCalled();
  });

  it('logs out and clears tokens', async () => {
    const clearSpy = jest.spyOn(tokenService, 'clearTokens').mockResolvedValue();

    await act(async () => {
      await useAuthStore.getState().logout();
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(clearSpy).toHaveBeenCalled();
  });
});
