import { act } from '@testing-library/react-native';

import { useTransactionStore } from '../stores/transactionStore';

jest.mock('../services/transactionClient', () => ({
  fetchTransactions: jest.fn(async () => [
    {
      id: 1,
      type: 'EXPENSE',
      amount: 12000,
      categoryId: 10,
      memo: null,
      occurredAt: '2025-01-01T00:00:00Z',
      createdAt: '',
      updatedAt: '',
    },
  ]),
  createTransaction: jest.fn(async (payload: any) => ({
    id: 2,
    ...payload,
    createdAt: '',
    updatedAt: '',
  })),
  updateTransaction: jest.fn(async (id: number, payload: any) => ({
    id,
    ...payload,
    createdAt: '',
    updatedAt: '',
  })),
  deleteTransaction: jest.fn(async () => {}),
}));

describe('transactionStore', () => {
  beforeEach(() => {
    useTransactionStore.setState({ items: [], loading: false, error: null });
  });

  it('loads transactions', async () => {
    await act(async () => {
      await useTransactionStore.getState().load();
    });

    expect(useTransactionStore.getState().items.length).toBe(1);
  });

  it('adds transaction', async () => {
    await act(async () => {
      await useTransactionStore.getState().add({
        type: 'EXPENSE',
        amount: 1000,
        categoryId: 10,
        memo: null,
        occurredAt: '2025-01-01T00:00:00Z',
      });
    });

    expect(useTransactionStore.getState().items[0].amount).toBe(1000);
  });

  it('updates transaction', async () => {
    useTransactionStore.setState({
      items: [
        {
          id: 1,
          type: 'EXPENSE',
          amount: 1000,
          categoryId: 10,
          memo: null,
          occurredAt: '2025-01-01T00:00:00Z',
          createdAt: '',
          updatedAt: '',
        },
      ],
    });

    await act(async () => {
      await useTransactionStore.getState().update(1, {
        type: 'EXPENSE',
        amount: 2000,
        categoryId: 10,
        memo: null,
        occurredAt: '2025-01-01T00:00:00Z',
      });
    });

    expect(useTransactionStore.getState().items[0].amount).toBe(2000);
  });

  it('removes transaction', async () => {
    useTransactionStore.setState({
      items: [
        {
          id: 1,
          type: 'EXPENSE',
          amount: 1000,
          categoryId: 10,
          memo: null,
          occurredAt: '2025-01-01T00:00:00Z',
          createdAt: '',
          updatedAt: '',
        },
      ],
    });

    await act(async () => {
      await useTransactionStore.getState().remove(1);
    });

    expect(useTransactionStore.getState().items.length).toBe(0);
  });
});
