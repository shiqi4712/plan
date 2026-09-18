# 正式部署记录

## 2026-09-18 历史数据更新（当前版本）

- 当前版本：`/srv/course-plans/releases/20260918-history-62d2a7b`，代码提交 `62d2a7b`。
- 上一版本：`/srv/course-plans/releases/20260918T054508Z-6fbae090`，保留用于回滚。
- 后台入口：https://plan.bcmty.cn/admin/analytics；登录入口 `/admin/login`，沿用既有账号配置。
- 历史快照：`/srv/course-plans/data/history-20260918.json`，通过 `ANALYTICS_HISTORY_FILE` 加载；删除操作记录在旁边的 `.deleted` 文件，原始快照保留。
- 导入 2026-09-11 至 2026-09-18 快照生成时的日志：1,964 次页面请求，按 IP 与浏览器信息匿名哈希估算 1,193 个独立访客。
- 五条课线请求量：探月 684、科特 Python 610、英才 Python 201、幼儿 219、火箭 250。
- 共享日志没有 Host 字段，按路径归属，无法排除全部预加载、人工测试或其他站点同路径请求；不是精确家长人数。
- 末页历史未采集，不能恢复。当前为一次性历史快照，后续访问不会自动追加。
- 已验证五条公开课线、46 个资源、后台鉴权、筛选、导出及移动端布局；线上删除测试仅取消，未删除生产记录。
- 本次未修改或重载 Nginx，仅重启 `course-plans.service`；核对 Nginx、learning-report-api、surprise-draw 的 PID 和启动时间未变化。

以下为 9 月 11 日首次发布记录，其中目录及后台开放状态已由以上更新替代。

更新日期：2026-09-11。服务器：39.96.54.176。域名：plan.bcmty.cn。

本次发布代码提交：f8cd3d821690f2b10ad8f49c8a1f9041baa8b321。包含五课线最新班型与物料、成果页顺序、2026年38枚金牌、教研信息及末页五大权威组织机构文案。

## 正式链接

- https://plan.bcmty.cn/course-plan/yucai-rocket
- https://plan.bcmty.cn/course-plan/yucai-preschool
- https://plan.bcmty.cn/course-plan/kete-moon
- https://plan.bcmty.cn/course-plan/kete-python
- https://plan.bcmty.cn/course-plan/yingcai-python

根路径和后台/API 路径不发布，返回 404。请发送完整课线链接。

## 服务位置

- 应用用户：courseplan（普通系统用户）
- 服务：course-plans.service，已设置开机启动
- 监听：127.0.0.1:3100
- 版本目录：/srv/course-plans/releases/20260911T084758Z
- 回滚版本：/srv/course-plans/releases/20260911T072601Z（完整保留）
- 当前链接：/srv/course-plans/current
- 源码包：/srv/course-plans/uploads/course-plans-20260911T084758Z.zip
- SHA-256：38183448fbf1b213f5344e400c7a4b60bc60d912716ae350968151618a793f03
- 实际部署配置：/srv/course-plans/deployment（优先于早期源码包内的通用模板）
- Nginx：/etc/nginx/sites-available/course-plans，sites-enabled 同名链接
- 证书：/etc/letsencrypt/live/plan.bcmty.cn/，本次证书有效至 2026-12-10
- 自动续期：系统现有 certbot.timer，webroot 为 /srv/course-plans/acme，续期后校验并平滑重载 Nginx

构建以单独的临时 systemd 服务执行：CPUQuota=60%、MemoryMax=1500M、Nice=15，以 courseplan 普通用户安装依赖、测试并构建。实际内存峰值约 783 MiB，耗时1分44秒。应用运行上限保持 CPUQuota=100%、MemoryHigh=600M、MemoryMax=800M；未升级服务器 Node.js 或系统包。

## 已完成验证

发布包104个文件与清单 SHA-256 一致。新版先在127.0.0.1:3105独立预览，五个路由和43项生产资源通过后停止预览服务，原子切换 current 并仅重启 course-plans；切换脚本带失败回滚。

五个正式 HTTPS 路由和43项页面资源通过，HTTP 自动跳转 HTTPS。线上320/390/815像素视口验收通过：成果页顺序、班型、双海报切换、38枚金牌、升学图表动画、教研数据、末页物料比例、五大机构文案、浮动与减少动态效果、上课安排按钮跳转正常，无浏览器脚本错误。

旧站点 bcmty.cn、yycl.bcmty.cn、guihua.bcmty.cn、mh.bcmty.cn 均返回200。原应用进程456574、461125、509841、531807与Nginx主进程531802的PID及启动时间保持不变；五份其他站点配置SHA-256保持一致。本次没有修改、重载或重启Nginx。

对不存在的动态路由做404验收时，Next.js 16.2.7 会记录 NoFallbackError；响应为预期的404，五个有效课线未出现该错误。

## 维护

```sh
systemctl status course-plans --no-pager
journalctl -u course-plans -n 100 --no-pager
node /srv/course-plans/current/scripts/verify-course-plans.mjs https://plan.bcmty.cn
```

后续发布应新建版本目录并限制构建资源，构建成功且独立预览通过后切换 current 链接，仅重启 course-plans。不要修改其他站点或重启服务器。

如需恢复本次更新前的版本，在root终端执行以下命令；仅适用于当前仍为20260911T084758Z的情况：

```sh
set -e
test "$(readlink -f /srv/course-plans/current)" = /srv/course-plans/releases/20260911T084758Z
test -s /srv/course-plans/releases/20260911T072601Z/.next/BUILD_ID
test ! -e /srv/course-plans/rollback-20260911T084758Z
ln -s /srv/course-plans/releases/20260911T072601Z /srv/course-plans/rollback-20260911T084758Z
mv -Tf /srv/course-plans/rollback-20260911T084758Z /srv/course-plans/current
systemctl restart course-plans
```

重启完成后用上方维护命令验证。回滚后最新班型、文案和物料也会恢复到首次发布状态。

本次使用的 plan-bcmty-deployment-20260911 公钥仅供临时部署，验收后从服务器授权文件精确移除；后续维护需要重新取得 SSH 授权。
