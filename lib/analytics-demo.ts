import { COURSE_PLAN_PROFILES } from './course-plan-profiles';

export const DEMO_END = '2026-09-17';
export const DEMO_START = '2026-08-19';
export const ANALYTICS_COURSES = Object.values(COURSE_PLAN_PROFILES).map(({ id, name }) => ({ id, name }));
export type DemoVisit = { id: string; visitor: string; course: string; date: string; closing: number };

export function daysBetween(start: string, end: string) {
  const days: string[] = [];
  for (let time = Date.parse(start + 'T00:00:00Z'); time <= Date.parse(end + 'T00:00:00Z'); time += 86400000) {
    days.push(new Date(time).toISOString().slice(0, 10));
  }
  return days;
}

// A fixed seed keeps screenshots, CSV exports and cross-course deduplication consistent.
function createVisits(): DemoVisit[] {
  let seed = 170926;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const visits: DemoVisit[] = [];
  daysBetween(DEMO_START, DEMO_END).forEach((date, day) => {
    ANALYTICS_COURSES.forEach((course, index) => {
      const count = Math.round(24 + random() * 35 + day * 1.4 + [20, 0, 40, 28, 8][index]);
      for (let n = 0; n < count; n++) {
        visits.push({ id: `${day}-${index}-${n}`, visitor: `visitor-${Math.floor(random() * 1600)}`, course: course.id, date,
          closing: random() < [0.35, 0.28, 0.57, 0.44, 0.49][index] ? (random() < 0.12 ? 2 : 1) : 0 });
      }
    });
  });
  return visits;
}
export const DEMO_VISITS = createVisits();

export function summarize(visits: DemoVisit[]) {
  const uv = new Set(visits.map(v => v.visitor)).size;
  const closingUV = new Set(visits.filter(v => v.closing > 0).map(v => v.visitor)).size;
  return { pv: visits.length, uv, closing: visits.reduce((total, v) => total + v.closing, 0), closingUV,
    rate: uv ? closingUV / uv * 100 : 0 };
}

export function selectVisits(start: string, end: string, course = 'all') {
  return DEMO_VISITS.filter(v => v.date >= start && v.date <= end && (course === 'all' || v.course === course));
}
