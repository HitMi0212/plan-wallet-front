import React from 'react';
import { render } from '@testing-library/react-native';

import { HomeScreen } from '../screens/main/HomeScreen';

jest.mock('../stores/summaryStore', () => ({
  useSummaryStore: () => ({
    monthly: null,
    loading: false,
    error: null,
    load: jest.fn(),
  }),
}));

describe('HomeScreen', () => {
  it('renders main buttons', () => {
    const { getByText } = render(<HomeScreen navigation={{ navigate: jest.fn() }} />);
    expect(getByText('카테고리')).toBeTruthy();
    expect(getByText('거래')).toBeTruthy();
    expect(getByText('통계')).toBeTruthy();
    expect(getByText('설정')).toBeTruthy();
  });
});
