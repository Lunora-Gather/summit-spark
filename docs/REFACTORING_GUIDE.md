# Refactoring Guide

本文件规定如何拆分和优化《山巅微光》的代码。当前目标是降低 `summit-spark.js` 单体维护压力，但不能牺牲现有 demo 的稳定性。

## 基本规则

1. 每次 PR 只拆一个边界：数据、纯函数、输入、存档、UI、渲染或物理。
2. 不在同一个 PR 里同时改架构和调玩法参数。
3. 不在没有测试覆盖的情况下改物理常量。
4. 不改变 public URL、HTML 入口和 GitHub Pages 静态部署方式。
5. 保持 `index.html` 与 `summit-spark.html` 一致，除非明确决定废弃双入口。
6. 所有重构必须保留 `npm run check` 通过。

## 安全拆分策略

### 1. 只读数据

优先拆地图和元数据，因为它们最容易用脚本校验。

候选内容：

- `ROOM_TARGETS`
- `ROOM_NAMES`
- `ROOM_TIERS`
- `ROOM_SKILLS`
- `SKILL_LABELS`
- `ROOM_GUIDES`
- `EXPERT_REQUIREMENTS`
- `ROOM_STYLE_TRIALS`
- `maps`

注意：如果数据被移动，`tools/check-maps.js` 也必须同步读取新位置。

### 2. 纯函数

纯函数应该无 DOM、无 canvas、无 localStorage、无全局状态。

候选内容：

- 时间格式化。
- clamp / lerp / normalize。
- split delta 计算。
- mastery 评分计算。
- Drill 合同结果格式化。

纯函数可以先保留在 `summit-spark.js` 内部引用，再逐步迁移。

### 3. DOM 查询

DOM 查询应集中管理，避免后续改 HTML 时漏改。

建议：

```js
export function getRequiredElement(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element;
}
```

但当前项目无 bundler，正式拆分前要决定：

- 保持单文件，但把 DOM 查询区块整理清楚；或
- 使用 `<script type="module">`，并更新浏览器 smoke；或
- 引入最轻量构建步骤。

短期建议是不引入 bundler，先做文档和数据拆分准备。

### 4. 输入系统

输入改动风险高。必须保持：

- 键盘、触控、手柄同时可用。
- 输入框内热键隔离。
- jump/dash/grab buffer。
- deadzone 设置。
- 抓墙 hold/toggle。
- 移动端 touch 坐标不受 visualViewport 错位影响。

输入 PR 必须跑 `npm run browser-smoke` 或手动覆盖相同路径。

### 5. 存档系统

存档改动风险高。必须保持：

- 旧 schema 可读。
- 错误 JSON 不刷新页面。
- 导入前写入 backup。
- backup 可恢复。
- 诊断不包含身份、UA、原始输入历史、秘密。

任何存档 schema 改动必须同步更新：

- `CHANGELOG.md`
- `KNOWN_ISSUES.md` 如有边界变化
- `RELEASE_CHECKLIST.md`
- browser smoke 对应路径

### 6. UI 面板

设置面板和练习面板必须保持职责分离。

设置面板：

- 控制。
- 音频。
- 显示。
- 反馈与存档。

练习面板：

- 房间。
- Route contracts。
- Feel Lab。
- Profile。
- Training。
- Advanced。

普通游玩 HUD 不应被训练数据淹没。

### 7. 物理和渲染

最后拆，因为它们最容易产生手感回归。

物理改动必须说明：

- 是否改变跳跃高度。
- 是否改变冲刺距离。
- 是否改变墙跳/抓墙。
- 是否改变危险判定。
- 是否改变光继点、棱镜、风、脆冰、回声。

渲染改动必须确认：

- Canvas 非空。
- 角色位移可见。
- 后段机制可读。
- 低性能模式不改变判定。
- 移动端没有遮挡关键路线。

## PR 粒度建议

推荐 PR 标题：

- `refactor(data): extract room metadata`
- `refactor(storage): isolate save archive normalization`
- `refactor(input): isolate keyboard and hotkey guards`
- `refactor(ui): split settings and practice panel updates`
- `test(docs): add documentation quality gate`
- `content(rooms): tune R7 readability from playtest feedback`

避免：

- `big refactor`
- `cleanup everything`
- `optimize game`
- `fix all issues`

## 回滚策略

每个阶段都要能快速回滚：

- 文档/模板改动可直接 revert。
- 数据拆分若失败，恢复到单体数据。
- 输入/存档/物理改动必须小步提交。
- 不要在同一 commit 里混合格式化和逻辑改动。

## 合并前检查

最低：

```bash
npm run check
git diff --check
```

高风险：

```bash
npm run browser-smoke
npm run route-audit
npm run state-check
```

人工：

- 打开本地页面一次。
- 至少通过 R1-R3。
- 若触及后段机制，至少手动进入相关房间。
- 若触及移动端，检查 390x700 和 700x390。
