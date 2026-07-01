# Quality Gates

本文件定义《山巅微光》的自动检查、人工检查和发布检查。目标是避免“能跑一次”被误认为“可以公开发布”。

## 自动检查

### `npm run check`

默认质量门，GitHub Pages workflow 会运行它。

覆盖范围：

- JS 语法检查。
- 本地服务器脚本检查。
- smoke 检查。
- 地图检查。
- Feel replay 检查。
- 合约检查。
- route audit。
- training state 检查。

原则：默认质量门不能强依赖浏览器可执行文件，因为 CI 或受限环境可能没有 Chrome/Edge。

### `node tools/check-docs.js`

文档完整性门。PR 和 Pages 部署前都会运行。

它会检查：

- 核心文档是否存在。
- README 是否保留运行、操作、开发方向和最新推进。
- 发布、试玩、已知限制、架构、内容、数据契约和重构说明是否齐全。
- PR 模板和 Issue 模板是否存在。

文档不是装饰。它承担三个作用：

1. 给试玩者入口。
2. 给维护者边界。
3. 给 AI/自动化任务明确约束，避免无边界改动。

### `node tools/check-public-surface.js`

公开页面一致性门。PR 和 Pages 部署前都会运行。

它会检查：

- `index.html` 与 `summit-spark.html` 保持一致。
- HTML `meta build-version` 与 CSS/JS 资源 query string 一致。
- Canvas、开始按钮、设置面板、练习按钮、反馈备注、存档导入、触控按钮和主脚本引用仍存在。

这个检查专门防止公开 demo 常见失误：入口页不同步、版本号没改全、部署出旧资源、关键按钮被误删。

### `node tools/check-data-contracts.js`

房间与训练数据契约门。PR 和 Pages 部署前都会运行。

它会检查：

- `maps` 与 `ROOM_TARGETS`、`ROOM_NAMES`、`ROOM_TIERS`、`ROOM_SKILLS`、`ROOM_GUIDES`、`ROOM_PURPOSES`、`ROOM_ROUTE_LINES`、`ROOM_STYLE_TRIALS`、`EXPERT_REQUIREMENTS` 数量一致。
- 每房都有 safe / fast / expert 三条路线说明。
- Style 合同必须包含 `kind`、`label`、`goal`、`clean`、`tech`、`timeScale`。
- Expert 和 Style 引用的技术 key 必须存在显示名。
- Route contract 的房间 index 和 mode 有效。
- Feel replay fixture 的房间编号、延迟和 expected 有效。

这个检查是 P2 低风险模块化的前置防护：先固定数据关系，再移动数据文件。

### `npm run browser-smoke`

强质量门，需要本机 Chrome/Edge headless。

适用场景：

- 改设置面板。
- 改练习面板。
- 改移动端布局。
- 改存档导入导出。
- 改输入系统。
- 改 Route / Feel / Drill 中断恢复。
- 改 canvas 初始化或渲染路径。

### `npm run route-audit`

用于路线可读性、Route contracts、Feel Lab fixture 和关键视觉辅助。

适用场景：

- 改房间地图。
- 改 target。
- 改机制分布。
- 改 route/feel/training 逻辑。

### `npm run state-check`

用于训练状态、恢复、中断和 schema 迁移。

适用场景：

- 改 Drill。
- 改 Route contracts。
- 改 Feel Lab。
- 改 localStorage schema。
- 改导入/导出/备份恢复。

## 人工检查

脚本无法代替以下人工检查：

- 真实手柄手感。
- 真实手机/平板触控。
- 完整 R1-R10 通关。
- 音频疲劳。
- 线上 Pages 是否服务最新构建。
- 玩家是否能理解下一步练什么。

人工检查结果应写入 Issue 或 `KNOWN_ISSUES.md`。

## 改动风险分级

| 风险 | 类型 | 必须检查 |
| --- | --- | --- |
| Low | README、docs、Issue 模板、PR 模板 | `node tools/check-docs.js` + `node tools/check-public-surface.js` |
| Medium | 地图元数据、训练文案、release checklist | `node tools/check-data-contracts.js` + `npm run check` + 相关人工检查 |
| High | 输入、存档、移动端 UI、Route/Feel/Drill 状态 | `npm run check` + `npm run browser-smoke` |
| Critical | 物理、碰撞、房间地图、渲染主循环 | `npm run check` + `npm run browser-smoke` + 人工 R1-R10 |

## 发布前最低清单

1. `node tools/check-docs.js`
2. `node tools/check-public-surface.js`
3. `node tools/check-data-contracts.js`
4. `npm run check`
5. `git diff --check`
6. 本地 `npm start` 打开一次。
7. 确认 `index.html` 和 `summit-spark.html` 一致。
8. 确认 build version 和资源 query string 一致。
9. 更新 `CHANGELOG.md`。
10. 按变更类型更新相关文档。
11. 合并后打开线上 Pages 检查版本。

## 失败处理

如果质量门失败：

1. 不要绕过 workflow。
2. 先确认是脚本、环境还是真实回归。
3. 如果是环境问题，记录到 PR。
4. 如果是真实回归，修复后重新运行相关检查。
5. 如果短期不修且不阻断发布，写入 `KNOWN_ISSUES.md`，但不能隐藏 P0/P1 问题。
