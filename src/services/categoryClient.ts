import { Category, CategoryCreateRequest, CategoryUpdateRequest } from './categoryApi';
import {
  createLocalCategory,
  deleteLocalCategory,
  getLocalCategories,
  requireAuthenticatedUserId,
  seedDefaultCategoriesIfEmpty,
  updateLocalCategory,
} from './localDb';

export async function fetchCategories(): Promise<Category[]> {
  const userId = await requireAuthenticatedUserId();
  await seedDefaultCategoriesIfEmpty(userId);
  return getLocalCategories(userId);
}

export async function createCategory(payload: CategoryCreateRequest): Promise<Category> {
  const userId = await requireAuthenticatedUserId();
  return createLocalCategory(userId, payload);
}

export async function updateCategory(id: number, payload: CategoryUpdateRequest): Promise<Category> {
  const userId = await requireAuthenticatedUserId();
  return updateLocalCategory(userId, id, payload);
}

export async function deleteCategory(id: number): Promise<void> {
  const userId = await requireAuthenticatedUserId();
  await deleteLocalCategory(userId, id);
}
