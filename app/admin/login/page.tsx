import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import AdminLogin from '@/components/AdminLogin';
import './login.css';

export const metadata: Metadata = { title: '管理员登录 | 编程猫', robots: { index: false, follow: false } };
export default async function LoginPage() {
  if (await isAdmin()) redirect('/admin/analytics');
  return <AdminLogin historical={!!process.env.ANALYTICS_HISTORY_FILE} />;
}
