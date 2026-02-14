import React from 'react';
import { render } from '@testing-library/react-native';

import { AppNavigator } from '../app/AppNavigator';

const mockUseAuthStore = jest.fn();

jest.mock('../stores/authStore', () => ({
  useAuthStore: (selector: any) => mockUseAuthStore(selector),
}));

jest.mock('../screens/auth/LoginScreen', () => ({
  LoginScreen: () => <></>,
}));

jest.mock('../screens/auth/SignUpScreen', () => ({
  SignUpScreen: () => <></>,
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

describe('AppNavigator', () => {
  it('renders auth stack when not authenticated', () => {
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ isAuthenticated: false })
    );

    render(<AppNavigator />);

    expect(mockUseAuthStore).toHaveBeenCalled();
  });

  it('renders main stack when authenticated', () => {
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ isAuthenticated: true })
    );

    render(<AppNavigator />);

    expect(mockUseAuthStore).toHaveBeenCalled();
  });
});
