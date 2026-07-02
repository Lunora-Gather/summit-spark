# Data Contracts

本文件定义《山巅微光》当前房间数据、训练数据和合约数据之间的约束。它是 P2 低风险模块化的前置条件：先把数据关系固定住，再逐步把数据从 `summit-spark.js` 抽到独立模块。

## 目标

- 保证每个房间都有完整元数据。
- 保证训练、路线、Style、Expert、Feel Lab 与房间数量同步。
- 让后续拆 `src/game/rooms.js` 时有自动检查兜底。
- 不改变物理、输入、存档和渲染行为。

## 当前数据源

当前数据仍在 `summit-spark.js` 内，主要包括：

| 数据 | 含义 |
| --- | --- |
| `maps` | 10 个房间的 tile 地图 |
| `ROOM_TARGETS` | 每房 target 时间 |
| `ROOM_NAMES` | 每房中文名 |
| `ROOM_TIERS` | 学习段、组合段、压力段、终盘段 |
| `ROOM_SKILLS` | 每房技能标签 |
| `SKILL_LABELS` | 技能标签显示名 |
| `ROOM_GUIDES` | 每房短引导 |
| `ROOM_PURPOSES` | 每房练习目的 |
| `ROOM_ROUTE_LINES` | safe / fast / expert 三条路线说明 |
| `ROOM_STYLE_TRIALS` | 每房 Style 合同 |
| `EXPERT_REQUIREMENTS` | 每房 Expert 关键动作要求 |
| `EXPERT_REQUIREMENT_LABELS` | Expert 要求显示名 |
| `ROUTE_CONTRACTS` | 多房间训练航线 |
| `FEEL_REPLAY_FIXTURES` | 手感校准/回放 fixture |

## 必须保持的关系

### 房间数量同步

以下数组必须与 `maps.length` 一致：

- `ROOM_TARGETS`
- `ROOM_NAMES`
- `ROOM_TIERS`
- `ROOM_SKILLS`
- `ROOM_GUIDES`
- `ROOM_PURPOSES`
- `ROOM_ROUTE_LINES`
- `ROOM_STYLE_TRIALS`
- `EXPERT_REQUIREMENTS`

### 房间目标

- target 必须为正数。
- target 不应随房间推进下降。
- 如果调整 target，必须在 `CHANGELOG.md` 说明原因。

### 路线说明

每房必须有三条路线说明：

1. 安全线。
2. 进阶线。
3. 高手线。

这三条路线分别服务于普通通关、节奏压缩和 Expert/高手动作验证。

### 技能标签

`ROOM_SKILLS` 只能引用 `SKILL_LABELS` 中存在的 key。新增技能标签时，必须同时补显示名，并确认训练/复盘文案能读懂。

### Style / Expert 合同

- 每房必须有一个 Style 合同。
- Style 合同必须有 `kind`、`label`、`goal`、`clean`、`tech`、`timeScale`。
- `timeScale` 必须大于 1。
- Expert 要求必须非空。
- Style / Expert 中的技术 key 必须存在于 `EXPERT_REQUIREMENT_LABELS`。

### Route contracts

每个 Route contract 必须有：

- `id`
- `label`
- `goal`
- `steps`

每个 step 的 `index` 必须指向存在的房间，`mode` 只能是：

- `clean`
- `pace`
- `style`
- `expert`

### Feel fixtures

每个 Feel fixture 必须有：

- `id`
- `room`
- `window`
- `maxDelay`
- `expected`
- `note`

`room` 使用 1-based 编号，必须落在当前房间范围内。

## 自动检查

`tools/check-data-contracts.js` 会读取 `summit-spark.js` 并检查上述关系。它不会改变游戏行为，只用于在拆数据前建立防护栏。

建议运行：

```bash
node tools/check-data-contracts.js
```

PR 和 Pages workflow 会在默认质量门前运行它。

## 导出工具

`tools/export-room-data.js` 用于把当前单体脚本中的房间和训练数据导出为 JSON，作为 P2 真正迁移前的桥。

查看导出内容：

```bash
node tools/export-room-data.js
```

写入快照：

```bash
node tools/export-room-data.js --write
```

检查快照是否同步：

```bash
node tools/export-room-data.js --check
```

当前 `--check` 的行为是：如果 `data/rooms.generated.json` 已提交，就检查快照是否与 `summit-spark.js` 同步；如果尚未提交快照，则只验证导出路径可用。

## 后续抽取计划

P2 真正拆分时，建议按以下顺序：

1. 使用 `tools/export-room-data.js --write` 生成 `data/rooms.generated.json`。
2. Review 生成文件，确认没有手抄或编码错误。
3. 创建 `src/game/rooms.js` 或 `data/rooms.js`，先迁移只读数据，不迁移物理和渲染逻辑。
4. 让 `tools/check-data-contracts.js` 优先从新数据文件读取。
5. 再更新 `tools/check-maps.js`。
6. 最后让 `summit-spark.js` 从新数据入口读取或在构建前生成静态数据。

## 禁止事项

- 不在同一 PR 中同时拆数据和改地图。
- 不在没有试玩反馈时新增房间。
- 不让 Style / Expert 合同引用不存在的机制。
- 不把路线说明写成长教程；每条应短、明确、可执行。
