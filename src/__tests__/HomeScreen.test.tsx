import React from 'react';
import { render } from '@testing-library/react-native';

import { HomeScreen } from '../screens/main/HomeScreen';

jest.mock('../stores/transactionStore', () => ({
  useTransactionStore: () => ({
    items: [],
    loading: false,
    error: null,
    load: jest.fn(),
  }),
}));

describe('HomeScreen', () => {
  it('renders main buttons', () => {
    const { getByText } = render(
      <HomeScreen navigation={{ navigate: jest.fn(), setOptions: jest.fn() }} />
    );
    expect(getByText('금일 현황')).toBeTruthy();
    expect(getByText('새 내역 등록')).toBeTruthy();
  });
});
