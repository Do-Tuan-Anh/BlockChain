import { AuthSearchParams, redirectAuthPage } from '@/lib/auth-redirect';
export default async function VerifyEmailPage({ searchParams }: { searchParams: AuthSearchParams }) {
  return redirectAuthPage('verify-email', searchParams);
}
