import { create } from 'zustand';

import { loginLocalUser, signUpLocalUser } from '../services/localDb';
import { clearTokens, loadTokens, saveTokens } from '../services/token';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  isHydrated: false,
  isAuthenticated: false,

  hydrate: async () => {
    const tokens = await loadTokens();
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isHydrated: true,
      isAuthenticated: Boolean(tokens.accessToken),
    });
  },

  login: async (email, password) => {
    const { accessToken, refreshToken } = await loginLocalUser(email, password);
    await saveTokens(accessToken, refreshToken);
    set({ accessToken, refreshToken, isAuthenticated: true });
  },

  signUp: async (email, password, nickname) => {
    await signUpLocalUser(email, password, nickname);
    await get().login(email, password);
  },

  logout: async () => {
    await clearTokens();
    set({ accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));
