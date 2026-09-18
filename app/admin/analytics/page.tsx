import type { Metadata } from 'next';
import './analytics.css';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import { getHistory } from '@/lib/history-store';
import LiveAnalytics from '@/components/LiveAnalytics';
import { getLiveAnalytics } from '@/lib/live-analytics-store';
import { beijingDate } from '@/lib/live-analytics-types';

export const metadata: Metadata = { title: '课线运营数据 | 编程猫', robots: { index: false, follow: false } };
export default async function AnalyticsPage() {
  if (!await isAdmin()) redirect('/admin/login');
  const history = getHistory();
  const today = beijingDate();
  return <LiveAnalytics initial={getLiveAnalytics({ start: today, end: today, course: 'all' })} history={history} />;
}
