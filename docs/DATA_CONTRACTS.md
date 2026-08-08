# Data contracts

## 当前数据源

浏览器运行时的房间地图、目标、章节文案、技能标签、路线说明、氛围色、章节岩台材质和 Style/Expert 合同统一位于 `public/modules/game/room-data.mjs`，导出后递归冻结。Route contracts 和 Feel fixtures 仍位于 `public/summit-spark.js`，因为它们与训练状态机共同演进。

`data/rooms.generated.json` 是由 `tools/export-room-data.js` 生成的验证快照。自动检查优先读取快照，同时用导出检查确认它没有落后于运行时源。

## 必须保持的关系

- 房间数量固定为 10，所有房间级数组长度一致。
- 每张地图固定 17 行、至少 30 列；同一房间各行等宽。R1–R3 为 30 列教学房，R4–R10 为 45 列长房。每房恰有一个位于左三列且由稳定地面支撑的 `S` 或 `P` 入口锚点，并具有按实际世界宽度计算的有效出口和边界缺口。
- `J` 表示长房第二屏唯一的中段营灯；R4–R10 各有一个、横坐标至少为 30、下方必须稳定支撑，后两格内必须有一个 `R` 恢复点。营灯只保存当前房间地图中真实存在且去重后的微光 ID，并锁定点亮时的分房用时；死亡/快速重开可恢复快照但不得把计时归零，整房重开必须清空。
- `D`、`E`、`K` 分别表示冲刺破门、相位台和巡游晶核；Style/Expert 引用 `gate`、`phase`、`drift` 时地图必须拥有对应实体。
- 每房都有目标时间、名称、技能标签、目的以及 safe/fast/expert 三条路线。
- 四幕各自拥有唯一且受支持的岩台材质 key；材质只改变缓存贴图，不改变地图与碰撞。
- Style 合同只能引用已知技术 key，并具有目标、时间比例和 clean 条件。
- Expert 条件必须与房间机制一致。
- Route contract 只能引用有效房间和 Drill 模式。
- Feel fixture 必须具有有效房间、窗口、最大延迟和 expected 标记。
- 路线点、PB、Focus 和 Flow 的存档规范化上限不得由内容数据绕过。
- Focus 计数必须保持因果关系：Clean 不得超过通关数，Drill 胜利不得超过对应尝试或汇总完成数，分项失误原因不得超过总失误；损坏数据按缺乏证据的一侧保守修复。

## 自动检查

```bash
node tools/export-room-data.js --check
node tools/check-data-contracts.js
node tools/check-maps.js
node tools/check-route-audit.js
```

`npm run check` 已包含这些命令。

## 修改流程

1. 修改 `public/modules/game/room-data.mjs` 中的房间内容；只在调整 Route/Feel 训练夹具时修改 `public/summit-spark.js`。
2. 运行 `node tools/export-room-data.js --write`。
3. 检查 JSON 差异是否仅反映预期内容。
4. 运行 `npm run check`。
5. 涉及地图、路线或难度时完成人工对应房间试玩。

不要手工编辑 `rooms.generated.json`，不要新增第二套常量，也不要让浏览器在启动时 fetch 验证快照。
