'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownToLine, ChartNoAxesCombined, Info, Trash2, ExternalLink, Eye, Users, Flag } from 'lucide-react';
import { COURSE_PLAN_PROFILES } from '@/lib/course-plan-profiles';
import type { HistoryData, HistoryRecord } from '@/lib/history-types';
import { logoutAdmin, deleteHistoricalData } from '@/app/admin/actions';

const courses = Object.values(COURSE_PLAN_PROFILES);
const count = (records: HistoryRecord[]) => ({pv: records.length, uv: new Set(records.map(r => r.visitor)).size});
export default function HistoryAnalytics({data}: {data: HistoryData}) {
  const [start, setStart] = useState(data.start);
  const [end, setEnd] = useState(data.end);
  const [course, setCourse] = useState('all');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const valid = !!start && !!end && start <= end && start >= data.start && end <= data.end;
  const records = valid ? data.records.filter(r => r.date >= start && r.date <= end && (course === 'all' || r.course === course)) : [];
  const totals = count(records);
  const rows = courses.filter(c => course === 'all' || c.id === course).map(c => ({...c, ...count(records.filter(r=>r.course===c.id))})).sort((a,b)=>b.pv-a.pv);
  const name = courses.find(c=>c.id===course)?.name ?? '全部五条课线';
  function exportData() {
    const csv = [['课线','开始日期','结束日期','历史日志请求量','估算UV','末页查阅','末页到达率'],...rows.map(r=>[r.name,start,end,r.pv,r.uv,'未采集','不可计算'])].map(r=>r.join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=`历史日志-${start}-${end}.csv`;a.click();URL.revokeObjectURL(url);
  }
  async function remove() {
    setPending(true);
    try {const n=await deleteHistoricalData(start,end,course);setNotice(`已从统计中删除 ${n} 条历史记录`);dialog.current?.close();router.refresh();}
    catch {setNotice('删除失败，请确认登录状态后重试');dialog.current?.close();}
    finally {setPending(false);}
  }
  return <div className="ops-app"><aside className="ops-sidebar"><a className="ops-brand" href="/admin/analytics"><span className="ops-brand-symbol"><ChartNoAxesCombined size={22}/></span><span>编程猫<strong>课线运营台</strong></span></a><small className="ops-nav-label">运营工作台</small><nav><button className="active"><Eye size={18}/>历史访问数据</button></nav><div className="ops-sidebar-bottom">服务器访问日志<small>历史数据已导入</small></div></aside><main className="ops-main"><header className="ops-topbar"><span>学习方案 / 历史访问数据</span><form action={logoutAdmin}><button className="ops-button">退出登录</button></form></header><div className="ops-body"><div className="ops-title-row"><div><small className="ops-eyebrow">HISTORICAL ANALYTICS</small><h1>历史访问数据</h1><p>数据截至 {new Date(data.importedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}（北京时间）</p></div><button className="ops-button" disabled={!records.length} onClick={exportData}><ArrowDownToLine size={16}/>导出数据</button></div>
    <div className="ops-demo-note"><Info size={17}/><span>已切换为历史日志数据，非模拟数据。末页查阅未采集；当前为一次性导入快照。</span></div>
    <section className="ops-filters"><div className="ops-dates"><input aria-label="开始日期" type="date" min={data.start} max={data.end} value={start} onChange={e=>setStart(e.target.value)}/><span>至</span><input aria-label="结束日期" type="date" min={data.start} max={data.end} value={end} onChange={e=>setEnd(e.target.value)}/></div><select aria-label="筛选课线" value={course} onChange={e=>setCourse(e.target.value)}><option value="all">全部课线</option>{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></section>
    {!valid && <p className="ops-error">请选择有效的日志日期范围：{data.start} 至 {data.end}。</p>}
    <div className="ops-data-actions"><span>当前范围：{name}</span><button className="ops-button ops-danger" disabled={!records.length} onClick={()=>dialog.current?.showModal()}><Trash2 size={15}/>删除当前数据</button></div>
    <section className="ops-metrics">{[{title:'历史日志请求量',value:totals.pv.toLocaleString(),note:'页面成功请求 · 非精确PV',Icon:Eye},{title:'估算独立访客',value:totals.uv.toLocaleString(),note:'按 IP + 浏览器信息去重',Icon:Users},{title:'末页查阅',value:'—',note:'历史未采集',Icon:Flag},{title:'末页到达率',value:'—',note:'历史不可计算',Icon:ChartNoAxesCombined}].map(m=><article className="ops-metric" key={m.title}><header>{m.title}<m.Icon size={18}/></header><strong>{m.value}</strong><p>{m.note}</p></article>)}</section>
    <section className="ops-course-section"><header className="ops-section-header"><div><h2>课线表现</h2><p>按历史请求量排序 · 汇总UV跨课线去重，不直接相加</p></div></header><div className="ops-table-scroll"><table><thead><tr><th>课线</th><th>历史日志请求量</th><th>估算UV</th><th>末页查阅</th><th>末页到达率</th><th>链接</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.name}<small className="ops-link-path">/course-plan/{r.id}</small></td><td className="ops-number">{r.pv.toLocaleString()}</td><td>{r.uv.toLocaleString()}</td><td>未采集</td><td>不可计算</td><td><a className="ops-icon-button" title={`打开${r.name}`} href={`/course-plan/${r.id}`} target="_blank" rel="noreferrer"><ExternalLink size={15}/></a></td></tr>)}</tbody></table></div></section>
    <section className="ops-definitions"><article><Info size={20}/><div><h2>历史数据口径</h2><p>仅统计五条课线的 GET 页面请求（200 / 304），排除可识别机器人、脚本、Headless 浏览器及带 _rsc 参数的请求。日志未记录域名，按课线路径归属；无法完全排除预加载、人工测试或同路径的其他站点请求，因此不是精确家长人数或精确PV。</p></div></article><article><Users size={20}/><div><h2>UV 为估算值</h2><p>按 IP 与浏览器信息的匿名哈希去重，不等同于用户账号或持久浏览器标识。网络变化可能重复计算，共用网络和同型号浏览器也可能合并。原始IP与浏览器信息不会在后台展示。</p></div></article><article><Flag size={20}/><div><h2>末页历史不可恢复</h2><p>翻页发生在浏览器内，旧日志无法判断是否查阅最后一页。需接入前端埋点后才能从接入当天开始统计。本次只同步已有日志，后续访问不会自动追加到此快照。</p></div></article></section>
    <dialog ref={dialog} className="ops-confirm" aria-labelledby="history-delete-title" onCancel={e=>{if(pending)e.preventDefault();}}><h2 id="history-delete-title">删除当前历史数据？</h2><p>{name} · {start} 至 {end}</p><p>将从所有管理员的统计结果中删除 {records.length} 条记录。其他日期和课线不受影响。原始日志备份保留。</p><footer><button className="ops-button" disabled={pending} onClick={()=>dialog.current?.close()}>取消</button><button className="ops-button ops-danger-solid" disabled={pending} onClick={remove}>{pending?'正在删除…':'确认删除'}</button></footer></dialog>
    {notice && <div className="ops-toast" role="status">{notice}<button onClick={()=>setNotice('')}>关闭</button></div>}
    </div></main></div>;
}
