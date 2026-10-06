import { AuthSearchParams, redirectAuthPage } from '@/lib/auth-redirect';
export default async function ResetPasswordPage({ searchParams }: { searchParams: AuthSearchParams }) {
  return redirectAuthPage('reset-password', searchParams);
}
