import type { Metadata } from 'next';
import AnalyticsDemo from '@/components/AnalyticsDemo';
import './analytics.css';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import { getHistory } from '@/lib/history-store';
import HistoryAnalytics from '@/components/HistoryAnalytics';

export const metadata: Metadata = { title: '课线运营数据 | 编程猫', robots: { index: false, follow: false } };
export default async function AnalyticsPage() {
  if (!await isAdmin()) redirect('/admin/login');
  const history = getHistory();
  if (history) return <HistoryAnalytics data={history} />;
  return <AnalyticsDemo />;
}
