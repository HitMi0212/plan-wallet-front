import React from 'react';
import { render } from '@testing-library/react-native';

import { SignUpScreen } from '../screens/auth/SignUpScreen';

jest.mock('../stores/authStore', () => ({
  useAuthStore: (selector: any) =>
    selector({
      signUp: jest.fn(),
    }),
}));

describe('SignUpScreen', () => {
  it('renders signup fields and button', () => {
    const { getByText, getByPlaceholderText } = render(
      <SignUpScreen navigation={{ goBack: jest.fn() }} />
    );

    expect(getByText('회원가입')).toBeTruthy();
    expect(getByPlaceholderText('user@example.com')).toBeTruthy();
  });
});
