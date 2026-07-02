# Contributing

感谢参与《山巅微光》。本项目目前处于 10 房 vertical slice 打磨阶段，优先级是稳定试玩、真实反馈、架构拆分和发布可信度，而不是继续堆新机制或新房间。

## 本地运行

```bash
npm start
```

打开：

```text
http://127.0.0.1:4173/
```

## 提交前检查

最低要求：

```bash
npm run check
git diff --check
```

高风险改动还需要：

```bash
npm run browser-smoke
npm run route-audit
npm run state-check
```

## 改动类型

### 文档 / 流程

低风险。更新对应文档，并确保 `tools/check-docs.js` 通过。

### 内容 / 房间 / 训练文案

中风险。必须说明改动基于哪条试玩反馈或哪条已知问题。

### 输入 / 存档 / 移动端 UI

高风险。必须覆盖 browser smoke 或人工等价路径。

### 物理 / 碰撞 / 渲染主循环

最高风险。必须解释手感影响，并至少人工覆盖相关房间。

## PR 要求

PR 描述必须写明：

- 改动范围。
- 是否改变玩法判定。
- 是否改变存档 schema。
- 已运行的检查。
- 是否需要更新 `CHANGELOG.md`。
- 是否需要更新 `KNOWN_ISSUES.md`。

## 内容边界

当前不要做：

- 在没有 R1-R10 真人试玩反馈前增加新房间。
- 新增账号、云存档、排行榜或联网服务。
- 添加第二套成就系统。
- 让普通游玩 HUD 变得比训练界面还复杂。
- 为了低性能设备削弱玩法判定。

## 文档索引

- `docs/ARCHITECTURE.md`：架构现状和目标结构。
- `docs/CONTENT_BIBLE.md`：内容定位、机制边界、文案语气。
- `docs/OPTIMIZATION_ROADMAP.md`：全面优化阶段路线。
- `docs/PLAYTEST_PROTOCOL.md`：人工试玩记录方法。
- `docs/REFACTORING_GUIDE.md`：安全拆分策略。
- `docs/QUALITY_GATES.md`：自动/人工/发布质量门。
