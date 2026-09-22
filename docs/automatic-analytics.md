# 自动访问统计

5 个家长端和 6 个 B 端正式链接自动上报访问与末页查阅；后台 `/admin/analytics` 默认显示今天，支持日期、链接筛选、CSV 导出和每 30 秒刷新。两端使用不同 course ID，数据分别统计。后台登录、静态资源请求及 Next.js 预加载不增加访问量。

## 统计口径

- PV：每次前台打开或刷新页面创建新的访问 ID。请求重试保持原 ID，服务端唯一键去重。
- UV：浏览器 localStorage 中保存随机匿名访客 ID，跨课线复用。服务器只保存其 SHA-256，不存姓名、手机号或 IP。清理存储、更换设备和无痕浏览可能产生新访客；禁用存储时只能在当前访问内识别。
- 末页查阅：进入最后一页，标题至少一半进入可视区域，且浏览器在前台持续停留满 1 秒后上报。每次访问最多计一次。该指标表示到达并短暂停留，不代表读完整页。
- 到达率：所选范围内末页查阅次数 / 访问量。UV 在所选日期及课线范围内重新去重，不能简单相加。
- 日期：北京时间，末页归属于该次访问开始日。跨午夜完成查阅会更新前一天的访问。
- 失败重试不会阻塞页面；浏览器拦截、提前关闭、长时间断网仍可能漏计。持久数据从接入时开始产生，历史末页不可补回。

历史 Nginx 数据通过后台“历史日志数据”单独查看，不和新的浏览器统计相加。旧日志缺少域名和浏览器访客标识，口径不同。删除历史数据不影响自动统计；删除自动统计按日期/课线同时移除访问和关联末页，只保留防止延迟重试恢复数据的去重记录。新访问继续记录。

## 存储与接口

使用 Node 内置 SQLite（Node 22.13+，服务器 22.22.3 已验证），无需新增数据库服务。

```dotenv
ANALYTICS_DB_FILE=/srv/course-plans/data/analytics.sqlite
ANALYTICS_ORIGIN=https://plan.bcmty.cn
ANALYTICS_HISTORY_FILE=/srv/course-plans/data/history-20260918.json
```

本地未配置数据库路径时使用 `.data/analytics.sqlite`，已加入 Git 忽略。线上数据库位于版本目录外，重启、切换版本不会清空；历史配置和管理员凭据沿用已有环境文件。

`POST /api/analytics/track` 只接受同源 JSON、固定 11 条链接、合法 UUID 及 visit/closing 事件。请求体最多 1KB，按来源 IP 做短时内存限流（不持久保存 IP）。统计查询与删除通过管理员鉴权的 Server Actions 执行，不公开数据读取接口。

SQLite 使用 WAL；备份运行中的数据库应使用 SQLite backup API，不能只复制主文件而遗漏未 checkpoint 的 WAL。部署回滚保留数据库，后续恢复自动统计后继续使用。

## 部署

在服务器的最新、干净 Git 工作区以 root 执行：

```bash
bash deployment/course-plans/deploy-live-analytics.sh
```

脚本保留管理员凭据、现有自动统计数据库和历史配置，在独立版本目录以 courseplan 用户限资源构建，使用独立预览数据库验证 11 条链接，然后原子切换 current，只重启 course-plans。仅更新 plan.bcmty.cn 的路由与采集接口，`nginx -t` 后平滑 reload，不重启 Nginx 或其他应用。失败自动恢复旧版本和该站点配置。

也支持使用本地 Git 源码归档：`bash deploy-live-analytics.sh /absolute/source.tar 完整提交SHA`。不上传 Windows 的 node_modules 或 .next。
