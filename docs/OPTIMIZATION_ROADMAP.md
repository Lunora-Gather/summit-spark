# Optimization Roadmap

本路线把“全面优化”拆成可合并、可验证、可回滚的小阶段。目标不是一次性大改，而是在不破坏公开 demo 的前提下，让内容、架构、测试、发布和协作都进入可持续状态。

## P0：稳定公开面

目标：保证现有 10 房 demo 可以被访问、试玩、反馈和回滚。

- [ ] 确认 GitHub Pages 当前线上版本与 HTML `meta build-version` 一致。
- [ ] 本地运行 `npm run check`。
- [ ] 有 Chrome/Edge 的机器运行 `npm run browser-smoke`。
- [ ] 按 `PLAYTEST_CHECKLIST.md` 完成一次 R1-R10 真人通关。
- [ ] 把真实问题写入 `KNOWN_ISSUES.md`，不要把猜想写进去。
- [ ] 使用 Issue 模板记录一次试玩反馈。

验收：不增加新机制，不改物理参数，不改房间数量，只让发布可信。

## P1：文档与协作体系

目标：任何人接手仓库都知道项目是什么、边界是什么、下一步怎么做。

- [x] 增加 `docs/ARCHITECTURE.md`。
- [x] 增加 `docs/CONTENT_BIBLE.md`。
- [x] 增加 `docs/OPTIMIZATION_ROADMAP.md`。
- [x] 增加 `docs/PLAYTEST_PROTOCOL.md`。
- [x] 增加 `docs/REFACTORING_GUIDE.md`。
- [x] 增加 `docs/QUALITY_GATES.md`。
- [x] 增加 PR 模板和 Issue 模板。
- [x] 增加 `tools/check-docs.js`，把文档完整性接入质量门。

验收：`npm run check` 通过，且文档缺失会失败。

## P2：低风险模块化

目标：开始拆 `summit-spark.js`，但只拆低风险内容。

推荐顺序：

1. 抽出 `src/core/constants.js`，保留原常量名。
2. 抽出 `src/game/rooms.js`，移动 `ROOM_TARGETS`、`ROOM_NAMES`、`ROOM_SKILLS`、`ROOM_GUIDES`、地图和合约数据。
3. 改造 `tools/check-maps.js`，优先从 `src/game/rooms.js` 读取数据。
4. 抽出 `src/core/math.js`，只放纯函数。
5. 保持 `summit-spark.js` 的 public 行为不变。

验收：

- `npm run check` 通过。
- `index.html` 和 `summit-spark.html` 仍然可直接运行。
- 不改变物理常量和房间数据语义。

## P3：输入与存档拆分

目标：把最容易出 bug 的输入/存档逻辑独立出来，并保留所有边界。

输入拆分必须覆盖：

- 键盘预设。
- 抓墙模式。
- 触控按钮。
- gamepad deadzone。
- 热键隔离：输入框内按 `O/P/Escape/R/T` 不应误触发游戏操作。
- dash/jump/grab buffer。

存档拆分必须覆盖：

- `summit-spark-settings`。
- `summit-spark-profile`。
- `summit-spark-room-focus`。
- `summit-spark-save` 导出/导入。
- `summit-spark-save-backup` 导入前备份与恢复。
- 错误 JSON 原地失败，不刷新页面。

验收：`npm run check` + `npm run browser-smoke`。

## P4：UI 面板和渲染拆分

目标：把设置面板、练习面板、HUD 和复盘分离，降低大文件维护成本。

优先拆：

- `ui/dom.js`：DOM 查询和空值断言。
- `ui/settings-panel.js`：设置面板状态、显示/隐藏、字段同步。
- `ui/practice-panel.js`：房间、Drill、Route、Feel、Profile、Training。
- `ui/hud.js`：meter、split、Flow、死亡数、房间卡。
- `render/draw-feedback.js`：ghost、路线、粒子、动作脉冲。

验收：普通游玩 HUD 保持安静；Practice 面板仍承担训练信息。

## P5：玩法打磨

目标：基于真实试玩反馈，而不是猜测，优化内容。

可做：

- 调整 R1-R10 个别平台、危险线或引导。
- 补充房间目的文案。
- 优化后段风/脆冰/棱镜可读性。
- 调整 split 目标，但必须记录原因。
- 调整音量或触控尺寸默认值。

不做：

- 不增加 R11+。
- 不新增大机制。
- 不重做视觉风格。
- 不把训练系统变成强制教程。

验收：更新 `CHANGELOG.md`、`KNOWN_ISSUES.md` 和对应清单。

## P6：发布节奏

每次公开更新都必须：

1. 修改 build version。
2. 更新 `CHANGELOG.md`。
3. 跑 `npm run check`。
4. 对高风险改动跑 `npm run browser-smoke`。
5. 按 `RELEASE_CHECKLIST.md` 做人工确认。
6. 合并后检查 Pages 线上版本。

## 当前优先级建议

下一步最值得做的三件事：

1. 做一次 R1-R10 真人试玩，拿到真实摩擦点。
2. 开始 P2，只抽房间数据和纯函数。
3. 改进 README 首页导航，让试玩者先看到“在线试玩 / 操作 / 反馈”。
