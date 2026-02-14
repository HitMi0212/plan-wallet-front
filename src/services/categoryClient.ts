import { getApiClient } from './api';
import { Category, CategoryCreateRequest, CategoryUpdateRequest } from './categoryApi';

const client = () => getApiClient();

export async function fetchCategories(): Promise<Category[]> {
  const response = await client().get('/categories');
  return response.data as Category[];
}

export async function createCategory(payload: CategoryCreateRequest): Promise<Category> {
  const response = await client().post('/categories', payload);
  return response.data as Category;
}

export async function updateCategory(id: number, payload: CategoryUpdateRequest): Promise<Category> {
  const response = await client().patch(`/categories/${id}`, payload);
  return response.data as Category;
}

export async function deleteCategory(id: number): Promise<void> {
  await client().delete(`/categories/${id}`);
}
