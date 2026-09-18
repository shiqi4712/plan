'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, SESSION_SECONDS, authenticate, endAdminSession } from '@/lib/admin-auth';

export async function loginAdmin(_state: { error: string }, data: FormData): Promise<{ error: string }> {
  const username = data.get('username');
  const password = data.get('password');
  if (typeof username !== 'string' || typeof password !== 'string' || username.length > 100 || password.length > 256 || !username || !password) return { error: '请输入有效的账号和密码。' };
  const result = authenticate(username.trim(), password);
  if (!result.token) return { error: result.error ?? '登录失败，请重试。' };
  (await cookies()).set(ADMIN_COOKIE, result.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/admin', maxAge: SESSION_SECONDS });
  redirect('/admin/analytics');
}

export async function logoutAdmin() {
  await endAdminSession();
  redirect('/admin/login');
}
