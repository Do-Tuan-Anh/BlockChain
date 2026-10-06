import { LocaleInitializer } from '../../components/LocaleInitializer';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'vi' }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'en' && locale !== 'vi') notFound();
  return (
    <>
      <LocaleInitializer locale={locale} />
      {children}
    </>
  );
}
