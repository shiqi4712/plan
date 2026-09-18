import { recordEvent, validEvent } from '@/lib/live-analytics-store';
export const runtime = 'nodejs';
const buckets = new Map<string, { until: number; count: number }>();
export async function POST(request: Request) {
  const reply = (status: number) => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.headers.get('origin') !== (process.env.ANALYTICS_ORIGIN || new URL(request.url).origin)) return reply(403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply(415);
  if (Number(request.headers.get('content-length')) > 1024) return reply(413);
  const ip = request.headers.get('x-real-ip') || 'local';
  const now = Date.now();
  if (buckets.size > 10000) for (const [key, bucket] of buckets) if (bucket.until <= now) buckets.delete(key);
  const bucket = buckets.get(ip);
  if (bucket && bucket.until > now) { if (++bucket.count > 240) return reply(429); }
  else { if (buckets.size >= 20000) return reply(429); buckets.set(ip, { until: now + 60000, count: 1 }); }
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply(400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 1024) { await reader.cancel(); return reply(413); }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!validEvent(body)) return reply(400);
    const result = recordEvent(body);
    return reply(result === 'ok' ? 204 : 409);
  } catch (error) {
    if (error instanceof SyntaxError) return reply(400);
    console.error('Analytics event could not be stored');
    return reply(503);
  }
}
