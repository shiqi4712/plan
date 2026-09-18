# 编程猫五课线培养方案

已上线的独立 Next.js 展示项目。五条课线共用页面、动效与翻页交互，分别配置首页班名、课程大纲、学习/赛考目标和上课安排。

| 课线 | 正式链接 |
| --- | --- |
| 育才班·火箭 | https://plan.bcmty.cn/course-plan/yucai-rocket |
| 英才班·幼儿 | https://plan.bcmty.cn/course-plan/yucai-preschool |
| 科特班·探月 | https://plan.bcmty.cn/course-plan/kete-moon |
| 科特班·Python | https://plan.bcmty.cn/course-plan/kete-python |
| 英才班·Python | https://plan.bcmty.cn/course-plan/yingcai-python |

每条课线13页。火箭育才班及幼儿英才班使用“学习目标”，幼儿版保留两张目标海报，使用每周五18:00解锁的独立时间表。幼儿版保留原有 `yucai-preschool` 路径，兼容已发送链接；两版分别配置教学服务海报。根路径 `/` 返回404，请使用完整课线链接。项目提供管理员登录及历史访问后台，不提供家长查询；管理员凭据通过环境配置保存。

## 本地运行

使用 Node.js 22 LTS 和 npm。

```sh
npm ci
npm run dev
```

打开 http://localhost:3000/course-plan/yucai-rocket 。其余课线更换路径末段即可。

```sh
npm run typecheck
npm test
npm run build
npm start -- --hostname 127.0.0.1 --port 3100
```

生产服务启动后，可执行 `node scripts/verify-course-plans.mjs http://127.0.0.1:3100` 检查五条课线及物料。Google Fonts 不可达时自动回退到本机中文字体。

## 内容维护

- `lib/course-plan-profiles.ts`：五条课线配置与物料路径。
- `components/CoursePlanViewer.tsx`：共享页面、交互与文案。
- `app/course-plan/course-plan.css`：布局和动效。
- `public/images/course-plan/`：本地化物料。
- `scripts/import-course-materials.mjs`：从约定的原始物料目录生成 WebP。
- `scripts/package-course-plans.mjs`：打包源码并生成文件清单与 SHA-256。

该仓库保存最新源码，推送代码不会自动发布到服务器。2026-09-11已将代码版本 `f8cd3d8` 发布到正式服务器，包含以下最新内容；发布位置与回滚说明以 DEPLOYED.md 为准。

成果页按“保送名校、科特生学员数、信奥金牌、助力升学”排列，标题按课线班型显示。金牌页使用2026年38枚金牌海报；升学对比保留重点中学与重点大学。专业教研页海报下展示四项教研信息。

最新末页更新为“11年编程猫”，使用北大联合共建与四大组织官方合作物料，突出2015年成立及70000+所服务学校，替换原 TIME 榜单海报。

末页文字根据补充信息更新为“五大权威组织机构认证”，名单增加中国人工智能学会；海报沿用所提供的原图。

## 部署

运营后台入口为 `/admin/login`。五条课线自动采集访问量、匿名浏览器 UV 和末页查阅，后台支持每 30 秒刷新、筛选、导出及删除。SQLite 文件保存在版本目录外，重启和更新保留数据。历史日志通过 `ANALYTICS_HISTORY_FILE` 单独查看，不混入自动统计；历史末页无法恢复。详见 [自动统计与部署](docs/automatic-analytics.md) 和 [历史数据说明](docs/historical-analytics.md)。使用 `deployment/course-plans/deploy-live-analytics.sh` 更新服务器，沿用管理员凭据与历史数据；账号密码环境配置不提交 Git。

Ubuntu 使用独立用户 `courseplan`、服务 `course-plans` 和内部端口3100，Nginx 仅为 `plan.bcmty.cn` 转发。HTTPS 证书通过 Certbot 自动续期。

实际部署位置、验收记录见 [DEPLOYED.md](deployment/course-plans/DEPLOYED.md)。部署脚本中的 `20260911T072601Z` 是首次发布版本号；后续发布应使用新目录并调整版本号。`activate-release.sh` 和 `publish-site.sh` 带首次部署前置检查，不应直接重复运行。先构建并验证新版本，再切换 `current`，仅重启 `course-plans`。

服务器无 GitHub 自动部署授权，临时部署 SSH 公钥已移除。后续更新需要重新取得 SSH 授权。不要修改其他应用目录、站点配置或数据库。
