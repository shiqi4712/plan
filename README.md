# 编程猫五课线培养方案

已上线的独立 Next.js 展示项目。五条课线共用页面、动效与翻页交互，分别配置首页班名、课程大纲、学习/赛考目标和上课安排。

| 课线 | 正式链接 |
| --- | --- |
| 育才班·火箭 | https://plan.bcmty.cn/course-plan/yucai-rocket |
| 英才班·幼儿 | https://plan.bcmty.cn/course-plan/yucai-preschool |
| 科特班·探月 | https://plan.bcmty.cn/course-plan/kete-moon |
| 科特班·Python | https://plan.bcmty.cn/course-plan/kete-python |
| 英才班·Python | https://plan.bcmty.cn/course-plan/yingcai-python |

每条课线13页。火箭育才班及幼儿英才班使用“学习目标”，幼儿版保留两张目标海报，使用每周五18:00解锁的独立时间表。幼儿版保留原有 `yucai-preschool` 路径，兼容已发送链接；两版分别配置教学服务海报。根路径 `/` 返回404，请使用完整课线链接。项目不提供家长查询、管理后台或数据库服务，也不需要环境密钥。

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

该仓库保存最新源码，推送代码不会自动发布到服务器。此次幼儿班名与物料更新、火箭教学服务图替换、全课线 TIME 2025 红白末页调整先在本地验证，尚未部署；线上记录以 DEPLOYED.md 为准。

## 部署

Ubuntu 使用独立用户 `courseplan`、服务 `course-plans` 和内部端口3100，Nginx 仅为 `plan.bcmty.cn` 转发。HTTPS 证书通过 Certbot 自动续期。

实际部署位置、验收记录见 [DEPLOYED.md](deployment/course-plans/DEPLOYED.md)。部署脚本中的 `20260911T072601Z` 是首次发布版本号；后续发布应使用新目录并调整版本号。`activate-release.sh` 和 `publish-site.sh` 带首次部署前置检查，不应直接重复运行。先构建并验证新版本，再切换 `current`，仅重启 `course-plans`。

服务器无 GitHub 自动部署授权，临时部署 SSH 公钥已移除。后续更新需要重新取得 SSH 授权。不要修改其他应用目录、站点配置或数据库。
