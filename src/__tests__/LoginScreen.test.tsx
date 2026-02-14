import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { LoginScreen } from '../screens/auth/LoginScreen';

jest.mock('../stores/authStore', () => ({
  useAuthStore: (selector: any) =>
    selector({
      login: jest.fn(),
      hydrate: jest.fn(),
      isHydrated: true,
    }),
}));

describe('LoginScreen', () => {
  it('renders login fields and button', () => {
    const { getByText, getByPlaceholderText } = render(
      <LoginScreen navigation={{ navigate: jest.fn() }} />
    );

    expect(getByText('plan-wallet')).toBeTruthy();
    expect(getByPlaceholderText('user@example.com')).toBeTruthy();
    expect(getByPlaceholderText('비밀번호')).toBeTruthy();
  });
});
