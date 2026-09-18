'use client';
import { useActionState, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, ArrowRight } from 'lucide-react';
import { loginAdmin } from '@/app/admin/actions';

export default function AdminLogin() {
  const [state, action, pending] = useActionState(loginAdmin, { error: '' });
  const [visible, setVisible] = useState(false);
  return <div className="ops-login"><header><img src="/images/course-plan/brand-lab-color.png" alt="北大·点猫科技人工智能教育联合实验室" /></header><main><div className="ops-login-symbol"><LockKeyhole size={25}/></div><small>COURSE OPERATIONS</small><h1>登录课线运营台</h1><p>编程猫 · 管理员工作区</p><form action={action}><label htmlFor="admin-username">管理员账号</label><input id="admin-username" name="username" autoComplete="username" required maxLength={100} placeholder="请输入账号" autoFocus/><label htmlFor="admin-password">密码</label><div className="ops-login-password"><input id="admin-password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" required maxLength={256} placeholder="请输入密码"/><button type="button" aria-label={visible ? '隐藏密码' : '显示密码'} title={visible ? '隐藏密码' : '显示密码'} onClick={()=>setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div><div className="ops-login-error" role="alert">{state.error}</div><button className="ops-login-submit" disabled={pending} type="submit">{pending ? '正在登录…' : '登录'}<ArrowRight size={17}/></button></form><footer>自动访问统计工作区</footer></main></div>;
}
