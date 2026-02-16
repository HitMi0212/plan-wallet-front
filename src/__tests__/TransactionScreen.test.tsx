import React from 'react';
import { render } from '@testing-library/react-native';

import { TransactionScreen } from '../screens/transaction/TransactionScreen';

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
    expect(getByText('새 거래')).toBeTruthy();
    expect(getByText('거래 내역이 없습니다.')).toBeTruthy();
  });
});
