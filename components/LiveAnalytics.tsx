'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ChartNoAxesCombined, Eye, Users, Flag, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import { B2B_PROFILE_IDS, CONSUMER_PROFILE_IDS, COURSE_PLAN_PROFILES } from '@/lib/course-plan-profiles';
import { beijingDate, type AnalyticsFilter, type LiveAnalyticsData } from '@/lib/live-analytics-types';
import type { HistoryData } from '@/lib/history-types';
import { loadLiveAnalytics, removeLiveAnalytics, logoutAdmin } from '@/app/admin/actions';
import HistoryAnalytics from './HistoryAnalytics';

const courses = Object.values(COURSE_PLAN_PROFILES);
const percent = (rate: number) => `${(rate * 100).toFixed(1)}%`;
export default function LiveAnalytics({ initial, history }: { initial: LiveAnalyticsData; history: HistoryData | null }) {
  const [filter, setFilter] = useState<AnalyticsFilter>({ start: beijingDate(), end: beijingDate(), course: 'all' });
  const [data, setData] = useState(initial);
  const [historical, setHistorical] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const sequence = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const valid = !!filter.start && !!filter.end && filter.start <= filter.end;
  const refresh = useCallback(async () => {
    if (!filter.start || !filter.end || filter.start > filter.end) return;
    const request = ++sequence.current;
    setBusy(true);
    try {
      const updated = await loadLiveAnalytics(filter);
      if (request === sequence.current) { setData(updated); setError(''); }
    } catch { if (request === sequence.current) setError('刷新失败，当前数据可能已过期。请重试或重新登录。'); }
    finally { if (request === sequence.current) setBusy(false); }
  }, [filter]);
  useEffect(() => {
    if (historical) return;
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 30000);
    const resume = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', resume);
    return () => { sequence.current++; clearInterval(timer); document.removeEventListener('visibilitychange', resume); };
  }, [refresh, historical]);
  const change = (patch: Partial<AnalyticsFilter>) => { sequence.current++; setBusy(true); setFilter(f => ({ ...f, ...patch })); };
  const name = courses.find(c => c.id === filter.course)?.name || '全部 11 条链接';
  function exportData() {
    const csv = [['课线','开始日期','结束日期','访问量','独立访客UV','末页查阅','末页到达率'], ...data.rows.map(r => [COURSE_PLAN_PROFILES[r.course].name, filter.start, filter.end, r.pv, r.uv, r.closing, percent(r.rate)])].map(row => row.join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `自动统计-${filter.start}-${filter.end}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }
  async function remove() {
    setDeleting(true);
    try { const count = await removeLiveAnalytics(filter); setNotice(`已删除 ${count} 次访问及对应末页记录`); dialog.current?.close(); await refresh(); }
    catch { setError('删除失败，请重试或重新登录。'); dialog.current?.close(); }
    finally { setDeleting(false); }
  }
  if (historical && history) return <><div className="ops-source-switch"><button className="ops-button" onClick={() => setHistorical(false)}>返回自动统计</button><span>历史日志快照 · 与自动统计分别计算</span></div><HistoryAnalytics data={history}/></>;
  return <div className="ops-app"><aside className="ops-sidebar"><a className="ops-brand" href="/admin/analytics"><span className="ops-brand-symbol"><ChartNoAxesCombined size={22}/></span><span>编程猫<strong>课线运营台</strong></span></a><small className="ops-nav-label">运营工作台</small><nav><button className="active"><Eye size={18}/>自动访问统计</button>{history && <button onClick={() => setHistorical(true)}><ChartNoAxesCombined size={18}/>历史日志数据</button>}</nav><div className="ops-sidebar-bottom">家长端 5 条 + B端 6 条<small>每 30 秒刷新</small></div></aside>
    <main className="ops-main"><header className="ops-topbar"><span>学习方案 / 自动访问统计</span><form action={logoutAdmin}><button className="ops-button">退出登录</button></form></header><div className="ops-body">
      <div className="ops-title-row"><div><small className="ops-eyebrow">COURSE ANALYTICS</small><h1>访问数据</h1><p>更新于 {new Date(data.updatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}（北京时间）</p></div><div className="ops-live-tools"><button className="ops-button" disabled={busy || !valid} onClick={() => void refresh()}><RefreshCw size={16}/>{busy ? '刷新中' : '刷新'}</button><button className="ops-button" disabled={busy || !valid || !!error} onClick={exportData}><ArrowDownToLine size={16}/>导出数据</button></div></div>
      <section className="ops-filters"><div className="ops-dates"><input aria-label="开始日期" type="date" value={filter.start} onChange={e => change({ start: e.target.value })}/><span>至</span><input aria-label="结束日期" type="date" value={filter.end} onChange={e => change({ end: e.target.value })}/></div><div className="ops-live-tools"><button className="ops-button" onClick={() => change({ start: beijingDate(), end: beijingDate() })}>今天</button><select aria-label="筛选课线" value={filter.course} onChange={e => change({ course: e.target.value })}><option value="all">全部链接</option><optgroup label="家长端">{CONSUMER_PROFILE_IDS.map(id => <option key={id} value={id}>{COURSE_PLAN_PROFILES[id].name}</option>)}</optgroup><optgroup label="B端">{B2B_PROFILE_IDS.map(id => <option key={id} value={id}>{COURSE_PLAN_PROFILES[id].name}</option>)}</optgroup></select></div></section>
      {(!valid || error) && <p className="ops-error" role="alert">{!valid ? '请选择有效的日期范围。' : error}</p>}
      <div className="ops-data-actions"><span>当前范围：{name}</span><button className="ops-button ops-danger" disabled={busy || !valid || !!error || !data.totals.pv} onClick={() => dialog.current?.showModal()}><Trash2 size={15}/>删除当前数据</button></div>
      <section className="ops-metrics" aria-busy={busy}>{[
        { title: '访问量', value: data.totals.pv.toLocaleString(), note: '每次打开或刷新计一次', Icon: Eye },
        { title: '独立访客 UV', value: data.totals.uv.toLocaleString(), note: '按匿名浏览器标识去重', Icon: Users },
        { title: '末页查阅', value: data.totals.closing.toLocaleString(), note: '同次访问最多计一次', Icon: Flag },
        { title: '末页到达率', value: data.totals.pv ? percent(data.totals.rate) : '—', note: '末页查阅 ÷ 访问量', Icon: ChartNoAxesCombined },
      ].map(m => <article className="ops-metric" key={m.title}><header>{m.title}<m.Icon size={18}/></header><strong>{valid && !busy && !error ? m.value : '—'}</strong><p>{m.note}</p></article>)}</section>
      <section className="ops-course-section"><header className="ops-section-header"><div><h2>课线表现</h2><p>按访问量排序 · 汇总 UV 跨课线去重</p></div></header><div className="ops-table-scroll"><table aria-busy={busy}><thead><tr><th>课线</th><th>访问量</th><th>独立访客 UV</th><th>末页查阅</th><th>末页到达率</th><th>链接</th></tr></thead><tbody>{valid && !busy && !error && data.rows.map(r => <tr key={r.course}><td>{COURSE_PLAN_PROFILES[r.course].name}<small className="ops-link-path">/course-plan/{r.course}</small></td><td className="ops-number">{r.pv.toLocaleString()}</td><td>{r.uv.toLocaleString()}</td><td>{r.closing.toLocaleString()}</td><td>{r.pv ? percent(r.rate) : '—'}</td><td><a className="ops-icon-button" title={`打开${COURSE_PLAN_PROFILES[r.course].name}`} href={`/course-plan/${r.course}`} target="_blank" rel="noreferrer"><ExternalLink size={15}/></a></td></tr>)}</tbody></table></div></section>
      <section className="ops-definitions"><article><Eye size={20}/><div><h2>自动采集</h2><p>启用时间：{new Date(data.startedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}（北京时间）。家长端 5 条与 B端 6 条链接分别记录，预加载不计数。刷新页面计为新访问；网络失败或浏览器拦截可能造成漏计。</p></div></article><article><Users size={20}/><div><h2>匿名访客</h2><p>同一浏览器使用持久匿名标识，不采集姓名、手机号或 IP。更换设备、无痕浏览、清理存储可能计为新访客，因此 UV 不等于准确家长人数。</p></div></article><article><Flag size={20}/><div><h2>末页查阅</h2><p>最后一页标题至少一半进入可视区域，且页面在前台持续停留满 1 秒才计数。同次访问反复翻页不重复统计；数据按访问开始的北京时间日期归属。历史日志没有末页记录，与自动统计分开查看。</p></div></article></section>
      <dialog ref={dialog} className="ops-confirm" aria-labelledby="live-delete-title" onCancel={e => { if (deleting) e.preventDefault(); }}><h2 id="live-delete-title">删除当前统计数据？</h2><p>{name} · {filter.start} 至 {filter.end}</p><p>删除所选范围内的访问及对应末页记录，对所有管理员生效。历史日志数据保留；新访问继续自动统计。</p><footer><button className="ops-button" disabled={deleting} onClick={() => dialog.current?.close()}>取消</button><button className="ops-button ops-danger-solid" disabled={deleting} onClick={remove}>{deleting ? '正在删除…' : '确认删除'}</button></footer></dialog>
      {notice && <div className="ops-toast" role="status">{notice}<button onClick={() => setNotice('')}>关闭</button></div>}
    </div></main></div>;
}
