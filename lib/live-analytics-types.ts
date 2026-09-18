export type AnalyticsFilter = { start: string; end: string; course: string };
export type LiveCounts = { pv: number; uv: number; closing: number; rate: number };
export type LiveAnalyticsData = {
  updatedAt: string; startedAt: string; totals: LiveCounts;
  rows: (LiveCounts & { course: string })[];
};
export function beijingDate(date = new Date()) {
  return new Date(date.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}
