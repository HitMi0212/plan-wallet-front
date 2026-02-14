import React from 'react';
import { render } from '@testing-library/react-native';

import { StatsScreen } from '../screens/stats/StatsScreen';

jest.mock('../stores/statsStore', () => ({
  useStatsStore: () => ({
    monthly: null,
    comparison: null,
    categoryTotals: [],
    loading: false,
    error: null,
    load: jest.fn(),
  }),
}));

describe('StatsScreen', () => {
  it('renders empty state when no data', () => {
    const { getByText } = render(<StatsScreen />);
    expect(getByText('통계')).toBeTruthy();
    expect(getByText('통계 데이터가 없습니다.')).toBeTruthy();
  });
});
