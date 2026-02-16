import React from 'react';
import { render } from '@testing-library/react-native';

import { TransactionScreen } from '../screens/transaction/TransactionScreen';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn(),
}));

jest.mock('../stores/transactionStore', () => ({
  useTransactionStore: () => ({
    items: [],
    loading: false,
    error: null,
    load: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  }),
}));

describe('TransactionScreen', () => {
  it('renders empty state', () => {
    const { getByText } = render(<TransactionScreen />);
    expect(getByText('추가')).toBeTruthy();
    expect(getByText('선택한 날짜의 거래가 없습니다.')).toBeTruthy();
  });
});
