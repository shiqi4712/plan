# 正式部署记录

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
