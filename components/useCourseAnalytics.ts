'use client';
import { useEffect, useRef, type RefObject } from 'react';

export function useCourseAnalytics(course: string | undefined, lastPage: boolean, pages: RefObject<HTMLDivElement | null>) {
  const session = useRef<{ course: string; visitor: string; visit: string; visited: boolean; closing: boolean } | null>(null);
  useEffect(() => {
    if (!course) return;
    if (!session.current || session.current.course !== course) {
      let visitor = crypto.randomUUID();
      try {
        const saved = localStorage.getItem('cp-anonymous-visitor-v1');
        if (saved && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(saved)) visitor = saved as typeof visitor;
        else localStorage.setItem('cp-anonymous-visitor-v1', visitor);
      } catch { /* Storage-disabled browsers retain this identifier for the current visit only. */ }
      session.current = { course, visitor, visit: crypto.randomUUID(), visited: false, closing: false };
    }
    const state = session.current;
    let disposed = false, busy = false;
    let visibleSince = 0;
    let lastVisible = false;
    const observer = new IntersectionObserver(entries => {
      lastVisible = entries.some(e => e.isIntersecting && e.intersectionRatio >= 0.5);
      if (!lastVisible) visibleSince = 0;
    }, { threshold: [0, 0.5] });
    const heading = pages.current?.querySelector('.cp-brand-closing h2');
    if (lastPage && heading) observer.observe(heading);
    async function send(event: 'visit' | 'closing') {
      const response = await fetch('/api/analytics/track', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, course: state.course, visitor: state.visitor, visit: state.visit }),
        keepalive: true, signal: AbortSignal.timeout(8000),
      });
      return response.ok;
    }
    async function tick() {
      if (disposed || busy) return;
      if (document.visibilityState !== 'visible') { visibleSince = 0; return; }
      busy = true;
      try {
        if (!state.visited) state.visited = await send('visit');
        if (disposed || document.visibilityState !== 'visible') { visibleSince = 0; return; }
        if (lastPage && lastVisible && !state.closing) {
          if (!visibleSince) visibleSince = Date.now();
          if (Date.now() - visibleSince >= 1000 && state.visited) state.closing = await send('closing');
        } else visibleSince = 0;
      } catch { /* Retry with the same visit ID; failed requests never block page navigation. */ }
      finally { busy = false; }
    }
    const visibility = () => { visibleSince = 0; void tick(); };
    const timer = window.setInterval(() => void tick(), 1000);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('online', visibility);
    void tick();
    return () => { disposed = true; observer.disconnect(); window.clearInterval(timer); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('online', visibility); };
  }, [course, lastPage, pages]);
}
