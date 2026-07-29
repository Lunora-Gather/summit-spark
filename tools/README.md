# Maintenance tools

这里仅保留会直接阻止运行时、数据、存档、可访问性或发布回归的工具。一次性迁移脚本、未来补丁生成器和只验证计划文档的检查不进入长期维护面。

## 核心门禁

| 命令 | 作用 |
| --- | --- |
| `npm run check` | 默认发布门，组合语法、文档、公开面、Appwrite、数据、地图、训练状态和 HTTP 冒烟检查 |
| `npm run browser-smoke` | Chrome/Edge 真实交互回归，覆盖账号、存档、移动端、焦点、Canvas 和输入 |
| `npm run route-audit` | 十房路线、训练合同和运行时钩子审计 |
| `npm run state-check` | Route、Feel、Drill、Challenge 和存档状态迁移矩阵 |
| `npm run smoke` | 本地服务器、安全响应头、公开文件白名单和关键资源检查 |

`check-core-format.mjs` 和 `check-core-math.mjs` 直接导入公开核心模块，固定时间、差值、评级、HTML 转义、矩形判定、距离和数值逼近的输入输出；它们由 `npm run check` 自动执行。

## 房间数据

- `lib/read-summit-data.js`：唯一允许解析 `public/summit-spark.js` 内嵌房间数据的共享读取器。
- `lib/validate-room-data.js`：地图、路线、Style/Expert 和 Feel 数据的共享验证器。
- `export-room-data.js`：生成或核对 `data/rooms.generated.json`。
- `report-room-data.js`：输出房间数据摘要。
- `check-data-contracts.js`、`check-maps.js`、`check-route-audit.js`：消费经过验证的快照。

更新房间数据后运行：

```bash
node tools/export-room-data.js --write
npm run check
```

`data/rooms.generated.json` 是验证快照，不是浏览器运行时输入。不要手工编辑。

## 安全与发布

- `check-public-surface.js`：检查单一 HTML 入口、CSP、版本号、Pages 暂存目录和嵌入保护。
- `check-appwrite-contract.js`：检查区域、最小服务面、认证策略和用户行级权限。
- `check-maintenance-tools.js`：检查工具语法、禁止已删除脚手架回归，并要求 GitHub Actions 固定完整提交 SHA。
- `check-docs.js`：检查维护者真正需要的文档和运行文件。

## 添加新检查

只有同时满足以下条件才新增脚本：

1. 能捕获真实产品或发布回归，而不是验证计划是否存在。
2. 可以在本地或 CI 稳定复现。
3. 已加入 `npm run check` 或有明确的人工运行入口。
4. 不重复解析 `public/summit-spark.js` 中的房间数据。

短期一次性迁移应在独立分支完成并随任务删除，不应长期留在 `tools/`。
