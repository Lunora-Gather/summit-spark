# Maintenance tools

这里仅保留会直接阻止运行时、数据、存档、可访问性或发布回归的工具。一次性迁移脚本、未来补丁生成器和只验证计划文档的检查不进入长期维护面。

## 核心门禁

| 命令 | 作用 |
| --- | --- |
| `npm run check` | 默认发布门，组合语法、文档、公开面、Appwrite、数据、地图、训练状态和 HTTP 冒烟检查 |
| `npm run browser-smoke` | Chrome/Edge 真实交互回归，覆盖账号、存档、移动端、焦点、Canvas、输入和隐藏面板 DOM 静止；R2 Relay 路线按角色实时位置发送真实输入，只允许一次完整重置后的有界重试 |
| `npm run css-audit` | 拒绝被后续同选择器完整覆盖的顶层 CSS 规则；`--write` 只清理可证明无效的完整块 |
| `npm run route-audit` | 十房路线、训练合同和运行时钩子审计 |
| `npm run state-check` | Route、Feel、Drill、Challenge 和存档状态迁移矩阵 |
| `npm run smoke` | 本地服务器、安全响应头、公开文件白名单和关键资源检查 |

`check-core-format.mjs`、`check-core-math.mjs`、`check-room-data.mjs`、`check-effect-budget.mjs`、`check-landmark-progress.mjs`、`check-audio-cues.mjs`、`check-storage.mjs`、`check-input.mjs`、`check-training.mjs`、`check-training-replay.mjs` 和 `check-ui-presentation.mjs` 直接导入公开模块，固定有限计时/差值、本地云时间、安全文本、数学、十房只读边界、长局视觉效果预算、山门/旧峰当前尝试地标进度、四幕声纹与转场节拍、存档精确同步/云冲突保护规则、输入映射、训练状态、五类房间推荐与三步计划目标、PB 路线动作语义，以及章节完成度/收束文案、房间训练/进度摘要、练习优先级、练习档案/长期挑战/手柄状态摘要、存档导入/备份摘要、安全反馈备注/模板、四幕汇总和本轮报告展示模型；它们由 `npm run check` 自动执行。

浏览器回归会构造一份因果合法的十房训练档案，同时验证开始页、三步计划、四类队列、四张长期挑战和实际“继续训练”启动均消费同一组综合/Clean/Pace/Style/Expert 推荐结果。

## 房间数据

- `lib/read-summit-data.js`：唯一允许合并解析 `public/modules/game/room-data.mjs` 与主运行时训练夹具的共享读取器。
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

- `check-public-surface.js`：检查单一 HTML 入口、CSP、版本号、Pages 暂存目录、嵌入保护，以及运行时函数、模块导入、顶层可变状态和 CSS 类消费者。
- `check-appwrite-contract.js`：检查区域、最小服务面、认证策略和用户行级权限。
- `check-maintenance-tools.js`：检查工具语法、禁止已删除脚手架回归，并要求 GitHub Actions 固定完整提交 SHA。
- `check-docs.js`：检查维护者真正需要的文档和运行文件。

## 添加新检查

只有同时满足以下条件才新增脚本：

1. 能捕获真实产品或发布回归，而不是验证计划是否存在。
2. 可以在本地或 CI 稳定复现。
3. 已加入 `npm run check` 或有明确的人工运行入口。
4. 不重复解析房间模块或主运行时中的训练夹具。

短期一次性迁移应在独立分支完成并随任务删除，不应长期留在 `tools/`。
