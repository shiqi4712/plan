import type { Metadata } from 'next';
import AnalyticsDemo from '@/components/AnalyticsDemo';
import './analytics.css';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';

export const metadata: Metadata = { title: '课线运营数据 | 编程猫', robots: { index: false, follow: false } };
export default async function AnalyticsPage() {
  if (!await isAdmin()) redirect('/admin/login');
  return <AnalyticsDemo />;
}
