export const PRODUCT_CATEGORIES = ['Sneakers', 'Electronics', 'Watches', 'Gaming', 'Collectibles', 'Fashion'] as const;
export const MAX_CATEGORY_LENGTH = 80;

// Categories are plain, single-line text. Keep the same value in DB and NFT metadata.
export function normalizeProductCategory(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const category = value.trim();
  return category.length > 0 && category.length <= MAX_CATEGORY_LENGTH && !/[\u0000-\u001f\u007f]/.test(category) ? category : null;
}

export function productCategoryLabel(category: string, translate: (key: string) => string): string {
  return (PRODUCT_CATEGORIES as readonly string[]).includes(category) ? translate(`categories.${category}`) : category;
}
