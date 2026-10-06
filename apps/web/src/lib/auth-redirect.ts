import { redirect } from 'next/navigation';

export type AuthSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function redirectAuthPage(path: string, searchParams: AuthSearchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  }
  redirect(`/vi/${path}${query.size ? `?${query}` : ''}`);
}
