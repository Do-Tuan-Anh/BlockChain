import { AuthSearchParams, redirectAuthPage } from '@/lib/auth-redirect';
export default async function LoginPage({ searchParams }: { searchParams: AuthSearchParams }) {
  return redirectAuthPage('login', searchParams);
}
