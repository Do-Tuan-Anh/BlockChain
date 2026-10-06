import { AuthSearchParams, redirectAuthPage } from '@/lib/auth-redirect';
export default async function RegisterPage({ searchParams }: { searchParams: AuthSearchParams }) {
  return redirectAuthPage('register', searchParams);
}
