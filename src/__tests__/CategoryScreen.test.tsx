import React from 'react';
import { render } from '@testing-library/react-native';

import { CategoryScreen } from '../screens/category/CategoryScreen';

jest.mock('../stores/categoryStore', () => ({
  useCategoryStore: () => ({
    items: [],
    loading: false,
    error: null,
    load: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  }),
}));

describe('CategoryScreen', () => {
  it('renders empty state', () => {
    const { getByText } = render(<CategoryScreen />);
    expect(getByText('추가')).toBeTruthy();
    expect(getByText('등록된 카테고리가 없습니다.')).toBeTruthy();
  });
});
