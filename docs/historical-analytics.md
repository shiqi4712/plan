# 历史日志导入

通过 `scripts/import-access-history.py` 读取现有 access.log 及轮转压缩文件。只接受五条课线路径的GET、200/304记录，排除可识别自动化浏览器、机器人与带_rsc参数的请求；上线前记录不导入。日期转换为北京时间。原始日志保持不变。

旧combined日志不含host，不能确认全部请求来自plan域名，也不能排除所有预加载或人工测试。后台明确标注“历史日志请求量”和“估算UV”，不是精确PV或家长人数。UV按IP与User-Agent的HMAC去重；原始IP、User-Agent不进入快照或客户端。密钥单独保存，不提交Git。

设置 `ANALYTICS_HISTORY_FILE=/srv/course-plans/data/history-20260918.json` 后，后台切换为历史数据。未设置时保留Demo；设置了但文件无法读取则报错，不静默退回模拟数据。导入是截至importedAt的一次性快照，不自动追加后续访问；重复导入需新文件名，避免重复累计与复活删除记录。

历史末页查阅、末页UV和到达率不可恢复，显示“未采集/不可计算”，CSV同样不填0。服务器端确认删除按日期和课线写入快照旁`.deleted`文件，所有管理员可见；原始快照保留。数据目录需courseplan可写，密钥仅root可读。单进程写入同步且原子替换。后续发布必须保留数据目录及环境配置。

导入示例（root）：

```bash
python3 scripts/import-access-history.py --output /srv/course-plans/data/history-20260918.json --key /srv/course-plans/data/history.key
```
