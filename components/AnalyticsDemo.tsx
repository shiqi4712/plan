'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { logoutAdmin } from '@/app/admin/actions';
import { Activity, ArrowDownToLine, ArrowDownWideNarrow, ArrowLeft, ArrowUpRight, BookOpen, ChartNoAxesCombined, Check, Copy, ExternalLink, Info, Layers, Users, Eye, Flag, RotateCcw, Trash2 } from 'lucide-react';
import { ANALYTICS_COURSES, DEMO_END, DEMO_START, daysBetween, selectVisits, summarize } from '@/lib/analytics-demo';

type View = 'overview' | 'courses' | 'definitions';
type Sort = 'pv' | 'uv' | 'closing' | 'rate';
const fmt = (n: number) => n.toLocaleString('zh-CN');
const rate = (n: number) => n.toFixed(1) + '%';
const href = (id: string) => `https://plan.bcmty.cn/course-plan/${id}`;
const DELETED_KEY = 'course-analytics-demo-deleted-v1';

export default function AnalyticsDemo() {
  const [view, setView] = useState<View>('overview');
  const [start, setStart] = useState('2026-09-11');
  const [end, setEnd] = useState(DEMO_END);
  const [course, setCourse] = useState('all');
  const [sort, setSort] = useState<Sort>('pv');
  const [detail, setDetail] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [deleted, setDeleted] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [action, setAction] = useState<'delete' | 'restore'>('delete');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(DELETED_KEY) ?? '[]');
      if (Array.isArray(stored) && stored.every(id => typeof id === 'string')) setDeleted(stored);
    } catch { setNotice('无法读取本地删除记录，请检查浏览器存储权限'); }
    setReady(true);
  }, []);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== DELETED_KEY && event.key !== null) return;
      try {
        const stored: unknown = JSON.parse(event.newValue ?? '[]');
        if (Array.isArray(stored) && stored.every(id => typeof id === 'string')) setDeleted(stored);
      } catch { setNotice('无法同步本地删除记录'); }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const deletedIds = useMemo(() => new Set(deleted), [deleted]);
  const valid = !!start && !!end && start <= end && start >= DEMO_START && end <= DEMO_END;
  const visits = useMemo(() => valid && ready ? selectVisits(start, end, course).filter(v => !deletedIds.has(v.id)) : [], [start, end, course, valid, ready, deletedIds]);
  const totals = summarize(visits);
  const rows = ANALYTICS_COURSES.filter(c => course === 'all' || c.id === course).map(c => ({ ...c, ...summarize(visits.filter(v => v.course === c.id)) })).sort((a,b) => b[sort] - a[sort]);
  const current = ANALYTICS_COURSES.find(c => c.id === detail);
  const detailVisits = visits.filter(v => v.course === detail);
  const selected = detail ? summarize(detailVisits) : totals;
  const affected = detail ? detailVisits : visits;
  const scopeName = current?.name ?? ANALYTICS_COURSES.find(c => c.id === course)?.name ?? '全部五条课线';

  function openAction(next: 'delete' | 'restore') {
    setAction(next);
    dialog.current?.showModal();
  }
  function confirmAction() {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(DELETED_KEY) ?? '[]');
      if (!Array.isArray(stored) || !stored.every(id => typeof id === 'string')) throw new Error('Invalid storage');
      const next = action === 'restore' ? [] : [...new Set([...stored, ...affected.map(v => v.id)])];
      localStorage.setItem(DELETED_KEY, JSON.stringify(next));
      setDeleted(next);
      setNotice(action === 'restore' ? '已恢复全部演示数据' : `已删除 ${scopeName} 的 ${fmt(affected.length)} 条访问记录及关联末页记录`);
      dialog.current?.close();
    } catch {
      dialog.current?.close();
      setNotice('操作未完成：无法保存本地数据，请检查浏览器存储权限后重试');
    }
  }

  function preset(days: number) {
    setStart(new Date(Date.parse(DEMO_END + 'T00:00:00Z') - (days - 1) * 86400000).toISOString().slice(0,10));
    setEnd(DEMO_END);
  }
  function exportCsv() {
    const csv = [['课线', '链接', '开始日期', '结束日期', '访问量PV', '独立访客UV', '末页查阅次数', '末页独立访客', '末页到达率'],
      ...rows.filter(r => !detail || r.id === detail).map(r => [r.name, href(r.id), start, end, r.pv, r.uv, r.closing, r.closingUV, rate(r.rate)])]
      .map(row => row.map(cell => `"${String(cell).replaceAll('"','""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `模拟数据-课线运营-${start}-${end}.csv`; a.click(); URL.revokeObjectURL(url);
    setNotice('已导出所选范围的模拟数据');
  }
  async function copy(id: string) {
    try { await navigator.clipboard.writeText(href(id)); setNotice('课线链接已复制'); }
    catch { setNotice('复制失败，请通过右侧打开链接按钮获取地址'); }
  }
  const definitions = [
    ['访问量 PV', '链接被打开的次数。同一位家长打开5次，计为5次访问。'],
    ['独立访客 UV', '所选日期范围内，按匿名浏览器标识去重。同一浏览器跨天访问仍计1位；换设备或清除浏览器数据可能被计为新访客，并非实名人数。'],
    ['末页查阅次数', '末页在前台可见并连续停留满2秒，记一次有效查阅。同一次进入只记一次；离开后再次进入并满足条件，可再次计数。'],
    ['末页独立访客', '所选范围内至少完成一次有效末页查阅的去重访客数量。'],
    ['末页到达率', '末页独立访客 ÷ 独立访客 × 100%。到达末页不代表逐页读完，也不代表报名转化。'],
    ['汇总与日期', '日期按北京时间筛选。全部课线UV跨链接去重，不能直接相加；每日UV不能相加成周期UV。Demo固定展示2026/08/19至2026/09/17的模拟记录。']
  ];

  return <div className="ops-app">
    <aside className="ops-sidebar">
      <a className="ops-brand" href="/admin/analytics"><span className="ops-brand-symbol"><ChartNoAxesCombined size={22}/></span><span>编程猫<strong>课线运营台</strong></span></a>
      <small className="ops-nav-label">运营工作台</small>
      <nav aria-label="运营导航">{([['overview','数据概览',Activity], ['courses','课线明细',Layers], ['definitions','统计口径',BookOpen]] as const).map(([id,label,Icon]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => {setView(id); setDetail(null);}}><Icon size={18}/>{label}{view === id && <span/>}</button>)}</nav>
      <div className="ops-sidebar-bottom"><Image src="/images/course-plan/brand-lab-color.png" alt="北大·点猫科技人工智能教育联合实验室" width={180} height={42} unoptimized className="ops-brand-partner"/><span className="ops-demo-dot"/>演示工作区<small>编程猫 · 英才计划</small></div>
    </aside>
    <main className="ops-main">
      <header className="ops-topbar"><span>学习方案 <span className="ops-slash">/</span> {view === 'definitions' ? '统计口径' : view === 'courses' ? '课线明细' : '数据概览'}</span><div className="ops-account"><span className="ops-demo-tag">DEMO · 模拟数据</span><form action={logoutAdmin}><button className="ops-button" type="submit">退出登录</button></form></div></header>
      <div className="ops-body">
        <div className="ops-title-row"><div><small className="ops-eyebrow">COURSE ANALYTICS</small><h1>{view === 'definitions' ? '统计口径' : current ? current.name : view === 'courses' ? '课线明细' : '课线访问概览'}</h1><p>{view === 'definitions' ? '统一口径，让每条课线的数据可比较。' : '追踪链接访问与末页到达，了解家长的浏览情况。'}</p></div>{view !== 'definitions' && <button className="ops-button" onClick={exportCsv} disabled={!valid || !visits.length}><ArrowDownToLine size={16}/>导出数据</button>}</div>
        <div className="ops-demo-note"><Info size={16}/><span>当前为模拟数据，未接入真实访问统计。</span><span className="ops-note-range">2026.08.19 — 2026.09.17</span></div>
        {view === 'definitions' ? <section className="ops-definitions">{definitions.map(([title,text],i) => <article key={title}><span>0{i+1}</span><div><h2>{title}</h2><p>{text}</p></div></article>)}</section> : <>
          <section className="ops-filters" aria-label="筛选数据"><div className="ops-presets">{[[1,'今天'],[7,'近7天'],[30,'近30天']].map(([days,label]) => <button key={days} className={valid && daysBetween(start,end).length === days && end === DEMO_END ? 'active' : ''} onClick={() => preset(Number(days))}>{label}</button>)}</div><div className="ops-dates"><input aria-label="开始日期" type="date" min={DEMO_START} max={DEMO_END} value={start} onChange={e=>{setStart(e.target.value);}}/><span>至</span><input aria-label="结束日期" type="date" min={DEMO_START} max={DEMO_END} value={end} onChange={e=>{setEnd(e.target.value);}}/></div><select aria-label="筛选课线" value={course} onChange={e=>{setCourse(e.target.value);setDetail(null);}}><option value="all">全部课线</option>{ANALYTICS_COURSES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="ops-icon-button" title="重置筛选" aria-label="重置筛选" onClick={()=>{preset(7);setCourse('all');setDetail(null);setNotice('');}}><RotateCcw size={16}/></button></section>
          {!valid && <p className="ops-error" role="alert">请选择 2026/08/19 至 2026/09/17 内的有效日期，开始日期不能晚于结束日期。</p>}
          <div className="ops-data-actions"><span>{ready ? `当前范围：${scopeName}` : '正在读取本地数据…'}</span>{deleted.length > 0 && <button className="ops-button" onClick={() => openAction('restore')}><RotateCcw size={15}/>恢复演示数据</button>}<button className="ops-button ops-danger" disabled={!ready || !valid || !affected.length} onClick={() => openAction('delete')}><Trash2 size={15}/>删除当前数据</button></div>
          {ready && valid && !affected.length && <div className="ops-empty" role="status">当前范围暂无数据，可调整筛选条件{deleted.length > 0 ? '或恢复演示数据。' : '。'}</div>}
          {current && <button className="ops-back" onClick={()=>setDetail(null)}><ArrowLeft size={15}/>返回课线汇总</button>}
          <section className="ops-metrics" aria-label="关键指标">{[
            {label:'访问量',suffix:'PV',value:fmt(selected.pv),hint:'链接累计打开次数',Icon:Eye,color:'red'},
            {label:'独立访客',suffix:'UV',value:fmt(selected.uv),hint:detail || course !== 'all' ? '所选范围内访客去重' : '跨课线、跨日期去重',Icon:Users,color:'blue'},
            {label:'末页查阅',suffix:'次数',value:fmt(selected.closing),hint:`${fmt(selected.closingUV)} 位访客到达末页`,Icon:Flag,color:'green'},
            {label:'末页到达率',suffix:'',value:rate(selected.rate),hint:'末页独立访客 / 独立访客',Icon:ChartNoAxesCombined,color:'amber'}
          ].map(m=><article className={`ops-metric ${m.color}`} key={m.label}><header><span>{m.label} <small>{m.suffix}</small></span><m.Icon size={18}/></header><strong>{m.value}</strong><p>{m.hint}</p></article>)}</section>
          {!detail ? <section className="ops-course-section"><header className="ops-section-header"><div><h2>课线表现 <small>{rows.length} 条链接</small></h2><p>同一位访客可访问多条课线，各课线 UV 不直接相加。</p></div><label className="ops-sort"><ArrowDownWideNarrow size={16}/><select aria-label="排序方式" value={sort} onChange={e=>setSort(e.target.value as Sort)}><option value="pv">按访问量</option><option value="uv">按独立访客</option><option value="closing">按末页查阅</option><option value="rate">按到达率</option></select></label></header><div className="ops-table-scroll"><table><thead><tr><th>课线 / 访问链接</th><th>访问量 PV</th><th>独立访客 UV</th><th>末页查阅</th><th>末页独立访客</th><th>末页到达率</th><th>操作</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.id}><td><button className="ops-course-name" onClick={()=>{setDetail(r.id);window.scrollTo({top:0,behavior:'smooth'});}}><span className="ops-rank">{String(i+1).padStart(2,'0')}</span>{r.name}<ArrowUpRight size={14}/></button><small className="ops-link-path">/course-plan/{r.id}</small></td><td className="ops-number">{fmt(r.pv)}</td><td>{fmt(r.uv)}</td><td>{fmt(r.closing)}</td><td>{fmt(r.closingUV)}</td><td><span className="ops-rate">{rate(r.rate)}</span><span className="ops-rate-track"><i style={{width:`${r.rate}%`}}/></span></td><td><div className="ops-actions"><button className="ops-icon-button" title={`复制${r.name}链接`} aria-label={`复制${r.name}链接`} onClick={()=>copy(r.id)}><Copy size={15}/></button><a className="ops-icon-button" href={href(r.id)} target="_blank" rel="noreferrer" title={`打开${r.name}`} aria-label={`打开${r.name}`}><ExternalLink size={15}/></a></div></td></tr>)}</tbody></table></div></section> : <section className="ops-detail-summary"><h2>从打开链接，到抵达末页</h2><div><span>访问过此课线<strong>{fmt(selected.uv)} <small>位访客</small></strong></span><ArrowUpRight size={24}/><span>末页停留满 2 秒<strong>{fmt(selected.closingUV)} <small>位访客</small></strong></span><span className="ops-detail-rate">{rate(selected.rate)}<small>末页到达率</small></span></div><a href={href(detail)} target="_blank" rel="noreferrer">打开此课线 <ExternalLink size={14}/></a></section>}
          <footer className="ops-footer"><span><Check size={14}/>模拟数据 · 北京时间</span><button onClick={()=>setView('definitions')}><Info size={14}/>查看统计口径</button></footer>
        </>}
        <dialog ref={dialog} className="ops-confirm" aria-labelledby="ops-confirm-title" aria-describedby="ops-confirm-description">
          <h2 id="ops-confirm-title">{action === 'delete' ? '删除当前范围的数据？' : '恢复全部演示数据？'}</h2>
          <p id="ops-confirm-description">{action === 'delete' ? '将删除所选访问记录及其关联末页查阅记录，并重新计算所有指标。' : '将恢复本浏览器中删除的全部模拟记录，包含当前筛选范围以外的数据。'}</p>
          {action === 'delete' && <dl><div><dt>课线</dt><dd>{scopeName}</dd></div><div><dt>日期</dt><dd>{start} 至 {end}</dd></div><div><dt>访问记录</dt><dd>{fmt(affected.length)} 条</dd></div><div><dt>末页查阅</dt><dd>{fmt(selected.closing)} 次</dd></div></dl>}
          <p className="ops-confirm-note">仅影响本浏览器的 Demo 模拟数据，不会删除课线链接或线上数据。</p>
          <footer><button className="ops-button" autoFocus onClick={() => dialog.current?.close()}>取消</button><button className={`ops-button ${action === 'delete' ? 'ops-danger-solid' : ''}`} onClick={confirmAction}>{action === 'delete' ? '确认删除' : '确认恢复'}</button></footer>
        </dialog>
        {notice && <div className="ops-toast" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="关闭提示">关闭</button></div>}
      </div>
    </main>
  </div>;
}
