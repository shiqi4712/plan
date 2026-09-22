# 课线链接部署

同一套 Next.js 应用提供 5 个家长端和 3 个 B 端固定链接，无需学生姓名或查询参数。B 端配置从对应家长端复制后独立维护。

一个展示子域名即可，例如 `plan.example.com`，无需为每条链接创建子域名。

| 版本 | 路径 |
| --- | --- |
| 育才班·火箭 | /course-plan/yucai-rocket |
| 育才班·幼儿 | /course-plan/yucai-preschool |
| 科特班·探月 | /course-plan/kete-moon |
| 科特班·Python | /course-plan/kete-python |
| 英才班·Python | /course-plan/yingcai-python |
| B端·育才班·火箭 | /course-plan/b-yucai-rocket |
| B端·科特班·探月 | /course-plan/b-kete-moon |
| B端·科特班·Python | /course-plan/b-kete-python |

## 内容维护

`lib/course-plan-profiles.ts` 管理首页班名、课程大纲、目标和时间表。共同页面与动效由 `components/CoursePlanViewer.tsx` 管理。育才班目标标题统一为“学习目标”；幼儿版保留两张目标图，按用户确认与火箭版共用时间表。图片已存入 `public/images/course-plan/`，服务器不依赖本地桌面文件。

更新原始物料后，可在项目根目录执行 `node scripts/import-course-materials.mjs "物料文件夹路径"` 生成 WebP。若图片比例改变，同时更新配置中的宽高；新增目标海报需加入 `goals.images` 数组。不同物料不要复用同一资源文件名，以免旧缓存影响显示。

## 生成发布包

在原项目运行 `node scripts/package-course-plans.mjs`。它将当前未提交修改一并打包到 `dist/course-plans-时间戳.zip`，并生成 SHA-256 校验文件。包内包含 8 条链接展示及统计所需源码、依赖锁文件、物料、检查脚本和部署配置，不含学生数据、环境密钥或本机依赖。

包内 `release-manifest.json` 记录每个源文件的 SHA-256。发布包是在 Ubuntu 上安装依赖和构建的源码包；不要直接上传本机 Windows 构建产物。物料导入和打包脚本随仓库维护，服务器使用已生成的物料。

## Ubuntu 部署步骤

推荐使用已有域名的独立子域名，例如 `courses.example.com`。将该子域名 A 记录指向阿里云服务器公网 IP，安全组开放 80、443。安装 Node.js 22 LTS、npm、Nginx。服务器上安装依赖并构建，不上传 Windows 的 `node_modules` 或 `.next`。

1. 创建专用系统用户 `courseplan`。上传 ZIP 及其 `.sha256` 校验文件，执行 `sha256sum -c 文件名.zip.sha256` 后解压到独立版本目录 `/srv/course-plans/releases/版本号`，该目录应归 `courseplan` 所有。本展示功能无需数据库、账号登录或环境密钥。
2. 在该目录以 `courseplan` 用户运行：

   ```sh
   npm ci
   npm run typecheck
   npm test
   npm run build
   ```

3. 构建成功后将 `/srv/course-plans/current` 链接到版本目录。核对 `command -v node`，据此修改 `course-plans.service` 的 `/usr/bin/node`。将服务文件安装到 `/etc/systemd/system/course-plans.service`，执行 `sudo systemctl daemon-reload`、`sudo systemctl enable --now course-plans`。在项目目录运行 `node scripts/verify-course-plans.mjs http://127.0.0.1:3100` 检查页面和物料。
4. 首次部署先安装 `nginx-bootstrap.conf` 作为独立站点，并创建 `/srv/course-plans/acme/.well-known/acme-challenge/`。运行 `sudo nginx -t`，通过后平滑重载 Nginx。使用 Certbot webroot 模式，以 `/srv/course-plans/acme` 为验证目录，为 `plan.bcmty.cn` 申请证书。不要覆盖现有站点配置。
5. 证书就绪后用 `nginx.conf` 替换本展示站点的 bootstrap 配置，校验并平滑重载。设置证书续期后执行 `nginx -t && systemctl reload nginx`。执行 `node scripts/verify-course-plans.mjs https://plan.bcmty.cn`，并逐一检查 8 个 HTTPS 链接、目标图片及手机翻页。国内用户加载不到 Google Fonts 时会使用页面配置的本机中文字体。

该应用已部署到 `plan.bcmty.cn`，详情见同目录 `DEPLOYED.md`。以上首次安装步骤用于新环境，不应在当前服务器重复执行。更换域名时同步修改两份 Nginx 配置及证书路径。

## 更新与回退

保留上一个版本目录。先在新的版本目录安装依赖并构建成功，再更新服务的工作目录或 `current` 链接并重启 `course-plans`。检查 8 个页面后完成发布；异常时切回上一版本并重启。用 `journalctl -u course-plans -n 100` 查看运行日志。不要在运行目录中直接删除 `.next` 后重建。
