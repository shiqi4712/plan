import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'course_admin_session';
export const SESSION_SECONDS = 8 * 60 * 60;
type AuthState = { sessions: Map<string, number>; failures: number; retryAt: number };
const globalAuth = globalThis as typeof globalThis & { courseAdminAuth?: AuthState };
const state = globalAuth.courseAdminAuth ??= { sessions: new Map(), failures: 0, retryAt: 0 };

export function authenticate(username: string, password: string) {
  const now = Date.now();
  if (state.retryAt > now) return { error: '尝试次数过多，请1分钟后重试。' };
  if (state.retryAt) { state.failures = 0; state.retryAt = 0; }
  const [salt, expectedHex] = (process.env.ADMIN_PASSWORD_HASH ?? '').split(':');
  if (!process.env.ADMIN_USERNAME || !salt || !/^[a-f0-9]{128}$/.test(expectedHex ?? '')) return { error: '登录服务尚未配置，请联系管理员。' };
  const actual = scryptSync(password, salt, 64);
  const matches = timingSafeEqual(actual, Buffer.from(expectedHex, 'hex'));
  if (username !== process.env.ADMIN_USERNAME || !matches) {
    state.failures++;
    if (state.failures >= 5) state.retryAt = now + 60_000;
    return { error: '账号或密码错误。' };
  }
  state.failures = 0;
  for (const [token, expires] of state.sessions) if (expires <= now) state.sessions.delete(token);
  const token = randomBytes(32).toString('hex');
  state.sessions.set(token, now + SESSION_SECONDS * 1000);
  return { token };
}

export async function isAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const expires = state.sessions.get(token);
  if (!expires || expires <= Date.now()) { state.sessions.delete(token); return false; }
  return true;
}

export async function endAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) state.sessions.delete(token);
  jar.delete(ADMIN_COOKIE);
}
