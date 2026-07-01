# AI Handoff Guide

本文件用于把任务交给 Codex、Copilot、ChatGPT 或其他代码助手时使用。目标是减少“看起来很努力但改坏项目”的风险。

## 项目事实

- 项目名：`summit-spark`
- 中文名：山巅微光
- 类型：原创精密平台跳跃 Canvas demo
- 当前范围：10 房 vertical slice
- 技术形态：原生 HTML/CSS/JS + Node 静态服务器
- 线上入口：`https://lunora-gather.github.io/summit-spark/`
- 主逻辑：`summit-spark.js`
- 发布：GitHub Pages workflow

## 开始任务前必须阅读

1. `README.md`
2. `KNOWN_ISSUES.md`
3. `RELEASE_CHECKLIST.md`
4. `PLAYTEST_CHECKLIST.md`
5. `docs/ARCHITECTURE.md`
6. `docs/CONTENT_BIBLE.md`
7. `docs/REFACTORING_GUIDE.md`
8. `docs/QUALITY_GATES.md`

## 通用任务提示词

```text
你正在维护 Lunora-Gather/summit-spark，一个原生 HTML/CSS/JS 的 Canvas 精密平台跳跃 demo。请先阅读 README.md、KNOWN_ISSUES.md、RELEASE_CHECKLIST.md、docs/ARCHITECTURE.md、docs/CONTENT_BIBLE.md、docs/REFACTORING_GUIDE.md 和 docs/QUALITY_GATES.md。不要增加新房间，不要新增账号/云存档/排行榜，不要改变 GitHub Pages 静态部署方式。所有改动必须保持 npm run check 通过；如果触及输入、存档、设置/练习面板、移动端或 Route/Feel/Drill 状态，还要运行 npm run browser-smoke 或说明未运行原因。
```

## 低风险任务模板

```text
请只做文档/流程优化，不改 summit-spark.js 的玩法逻辑。目标是让新维护者更容易理解项目边界、发布流程、试玩反馈和重构路线。完成后运行或至少检查 node tools/check-docs.js。
```

## 房间数据拆分任务模板

```text
请做低风险模块化第一步：只抽出房间元数据和地图数据，不改变任何房间内容、物理常量、输入判定或 UI 行为。同步更新 tools/check-maps.js，让它能从新数据位置读取并保持原检查语义。完成后运行 npm run check。
```

## 存档系统任务模板

```text
请隔离 localStorage 和 save archive 逻辑。必须保留旧 schema 可读、错误 JSON 原地失败、导入前写入 summit-spark-save-backup、恢复备份、诊断脱敏。不得改变普通游玩和 Practice 面板行为。完成后运行 npm run check 和 npm run browser-smoke。
```

## 输入系统任务模板

```text
请隔离键盘、触控和手柄输入逻辑。必须保留 jump/dash/grab buffer、抓墙 hold/toggle、gamepad deadzone、输入框热键隔离、移动端 visualViewport 触摸坐标修正。不得改变手感参数。完成后运行 npm run check 和 npm run browser-smoke。
```

## 内容打磨任务模板

```text
请基于 PLAYTEST_PROTOCOL.md 里的真实试玩反馈打磨 R1-R10。不要新增 R11+。每个房间改动必须说明原因：路线可读性、难度曲线、移动端遮挡、训练建议或机制引导。更新 CHANGELOG.md 和 KNOWN_ISSUES.md。完成后运行 npm run check；若改地图或后段机制，覆盖相关房间试玩。
```

## 禁止事项

- 不要一次性重写整个游戏。
- 不要把项目迁移到 React/Vite，除非另开架构决策 PR。
- 不要在没有试玩反馈的情况下加新机制。
- 不要删除 `KNOWN_ISSUES.md` 中的人工验证边界。
- 不要把 browser smoke 加进默认 gate，导致没有浏览器的 CI 失败。
- 不要让普通游玩 HUD 变成训练仪表盘。

## 输出要求

每次任务结束都要说明：

- 改了哪些文件。
- 是否改变玩法判定。
- 是否改变存档 schema。
- 运行了哪些检查。
- 哪些检查未运行以及原因。
- 下一步建议。
