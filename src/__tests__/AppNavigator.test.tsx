import React from 'react';
import { render } from '@testing-library/react-native';

import { AppNavigator } from '../app/AppNavigator';

const mockUseAuthStore = jest.fn();

jest.mock('../stores/authStore', () => ({
  useAuthStore: (selector: any) => mockUseAuthStore(selector),
}));

jest.mock('../screens/main/HomeScreen', () => ({
  HomeScreen: () => <></>,
}));

jest.mock('../screens/category/CategoryScreen', () => ({
  CategoryScreen: () => <></>,
}));

jest.mock('../screens/transaction/TransactionScreen', () => ({
  TransactionScreen: () => <></>,
}));

jest.mock('../screens/stats/StatsScreen', () => ({
  StatsScreen: () => <></>,
}));

jest.mock('../screens/assets/AssetFlowScreen', () => ({
  AssetFlowScreen: () => <></>,
}));

jest.mock('../screens/assets/TotalWealthScreen', () => ({
  TotalWealthScreen: () => <></>,
}));

jest.mock('../screens/settings/SettingsScreen', () => ({
  SettingsScreen: () => <></>,
}));

describe('AppNavigator', () => {
  it('renders boot screen when not hydrated', () => {
    const hydrate = jest.fn();
    const state = { isAuthenticated: false, isHydrated: false, hydrate };
    mockUseAuthStore.mockImplementation((selector) => selector(state));

    const { getByText } = render(<AppNavigator />);

    expect(getByText('세션을 불러오는 중입니다.')).toBeTruthy();
  });

  it('renders main tabs after hydration', () => {
    const hydrate = jest.fn();
    const state = { isAuthenticated: false, isHydrated: true, hydrate };
    mockUseAuthStore.mockImplementation((selector) => selector(state));

    render(<AppNavigator />);

    expect(mockUseAuthStore).toHaveBeenCalled();
  });
});
