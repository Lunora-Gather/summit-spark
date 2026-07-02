# Architecture Guide

《山巅微光》当前是一个无构建步骤的 Canvas 游戏原型：`index.html` 与 `summit-spark.html` 作为入口，`summit-spark.css` 负责界面与响应式布局，`summit-spark.js` 承载游戏循环、地图、输入、物理、渲染、训练、存档和调试逻辑，`game-server.js` 提供本地静态服务。

本文件定义后续架构优化方向。原则是：先稳定公开演示，再逐步拆分；每一步都必须保持 `npm run check` 通过，并保持 GitHub Pages 仍可直接部署静态文件。

## 当前运行边界

- 线上入口：`https://lunora-gather.github.io/summit-spark/`
- 本地入口：`npm start` 后访问 `http://127.0.0.1:4173/`
- 发布入口：`.github/workflows/pages.yml`
- 质量门：`npm run check`、`npm run browser-smoke`、`npm run route-audit`、`npm run state-check`

## 当前主要模块职责

| 区域 | 当前文件 | 职责 |
| --- | --- | --- |
| HTML Shell | `index.html`, `summit-spark.html` | Canvas、HUD、设置面板、练习面板、启动层、触控按钮 |
| Styling | `summit-spark.css` | 游戏外壳、HUD、设置/练习面板、移动端布局、视觉层级 |
| Game Runtime | `summit-spark.js` | 游戏循环、物理、输入、地图、渲染、训练、存档、反馈、音频、调试 |
| Local Server | `game-server.js` | 本地静态文件服务，默认打开 `summit-spark.html` |
| Quality Tools | `tools/check-*.js` | 语法、地图、路线、训练状态、浏览器冒烟、合约、文档检查 |
| Release Docs | `README.md`, `CHANGELOG.md`, `RELEASE_CHECKLIST.md`, `PLAYTEST_CHECKLIST.md`, `KNOWN_ISSUES.md` | 面向玩家、发布和人工验证 |

## 目标架构

长期目标不是引入沉重框架，而是把单体脚本拆成可审查、可测试、可迁移的领域模块。建议最终结构：

```text
src/
├─ core/
│  ├─ constants.js          # 物理、时间、尺寸、存档 key 等常量
│  ├─ loop.js               # requestAnimationFrame、dt、暂停与 hitstop
│  └─ math.js               # clamp、lerp、rect、向量等纯函数
├─ game/
│  ├─ player.js             # 玩家状态、移动、跳跃、冲刺、抓墙、死亡/重生
│  ├─ physics.js            # 碰撞、tile 判定、重力、风、脆冰、棱镜、光继点
│  ├─ rooms.js              # 地图、房间目标、房间名、技能标签、难度元数据
│  └─ progression.js        # 房间切换、登顶、PB、split、Flow
├─ systems/
│  ├─ input.js              # 键盘、触控、手柄、键位预设、输入缓冲
│  ├─ storage.js            # localStorage schema、导入导出、备份恢复、迁移
│  ├─ audio.js              # 音效开关、音量、状态提示
│  └─ diagnostics.js        # 反馈模板、诊断快照、脱敏规则
├─ training/
│  ├─ focus.js              # Focus 档案、薄弱房、练习建议
│  ├─ drills.js             # Clean/Pace/Style/Expert 合同
│  ├─ routes.js             # Route contracts、路线目标、中断恢复
│  └─ feel-lab.js           # Feel Lab、手感校准、练习卡
├─ ui/
│  ├─ dom.js                # DOM 查询与空值断言
│  ├─ hud.js                # HUD、meter、房间卡、split popup
│  ├─ settings-panel.js     # 设置面板
│  ├─ practice-panel.js     # 练习面板
│  └─ responsive.js         # 移动端、触控尺寸、visualViewport 适配
└─ render/
   ├─ canvas.js             # Canvas 尺寸、缩放、背景
   ├─ draw-world.js         # tile、hazard、relay、wind、prism、echo
   ├─ draw-player.js        # 角色、状态脉冲、方向线
   └─ draw-feedback.js      # ghost、路线线、粒子、提示
```

## 拆分顺序

1. **只读数据先拆**：房间名、目标、技能标签、路线描述、Style/Expert 合约。风险最低，容易用现有 `check-maps.js` 对齐。
2. **纯函数再拆**：数学工具、格式化时间、clamp、storage normalization。风险较低，可单独测试。
3. **输入系统拆分**：键盘、触控、手柄要保留现有缓冲、热键隔离和移动端规则。
4. **存档系统拆分**：必须保留 schema 迁移、导入前备份、错误 JSON 原地失败。
5. **UI 面板拆分**：设置/练习面板先拆 DOM 更新函数，不改变 HTML 结构。
6. **物理与渲染最后拆**：这是高风险区域，必须在人工试玩和 browser smoke 之后进行。

## 不做的事

- 不在没有完整 10 房真人试玩前增加新房间。
- 不把低性能问题通过削弱玩法解决。
- 不引入云存档、账号系统或联网服务。
- 不把训练/复盘 UI 混回普通游玩 HUD。
- 不把 `npm run check` 变成必须依赖浏览器的流程；浏览器冒烟保持为更强的可选门。

## 每次架构改动的验收

每个 PR 必须说明：

- 改动区域：数据 / 输入 / UI / 存档 / 物理 / 渲染 / 文档 / 工具。
- 是否改变玩法判定。
- 是否改变存档 schema。
- 是否需要更新 `CHANGELOG.md`。
- 本地至少运行 `npm run check`。
- 若触及移动端、设置面板、练习面板、存档或输入，必须运行或人工覆盖 `npm run browser-smoke` 对应路径。
