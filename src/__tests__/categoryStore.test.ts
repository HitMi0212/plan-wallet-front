import { act } from '@testing-library/react-native';

import { useCategoryStore } from '../stores/categoryStore';
import { Category } from '../services/categoryApi';

jest.mock('../services/categoryClient', () => ({
  fetchCategories: jest.fn(async () => [
    { id: 1, name: '식비', type: 'EXPENSE', createdAt: '', updatedAt: '' },
  ]),
  createCategory: jest.fn(async () => ({
    id: 2,
    name: '급여',
    type: 'INCOME',
    createdAt: '',
    updatedAt: '',
  })),
  updateCategory: jest.fn(async (id: number) => ({
    id,
    name: '수정',
    type: 'EXPENSE',
    createdAt: '',
    updatedAt: '',
  })),
  deleteCategory: jest.fn(async () => {}),
}));

describe('categoryStore', () => {
  beforeEach(() => {
    useCategoryStore.setState({ items: [], loading: false, error: null });
  });

  it('loads categories', async () => {
    await act(async () => {
      await useCategoryStore.getState().load();
    });

    expect(useCategoryStore.getState().items.length).toBe(1);
  });

  it('adds category', async () => {
    await act(async () => {
      await useCategoryStore.getState().add({ name: '급여', type: 'INCOME' });
    });

    expect(useCategoryStore.getState().items[0].name).toBe('급여');
  });

  it('updates category', async () => {
    useCategoryStore.setState({
      items: [{ id: 1, name: '식비', type: 'EXPENSE', createdAt: '', updatedAt: '' }],
    });

    await act(async () => {
      await useCategoryStore.getState().update(1, '수정');
    });

    expect(useCategoryStore.getState().items[0].name).toBe('수정');
  });

  it('removes category', async () => {
    useCategoryStore.setState({
      items: [{ id: 1, name: '식비', type: 'EXPENSE', createdAt: '', updatedAt: '' }],
    });

    await act(async () => {
      await useCategoryStore.getState().remove(1);
    });

    expect(useCategoryStore.getState().items.length).toBe(0);
  });
});
