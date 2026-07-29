# Room data snapshot

`rooms.generated.json` 是从 `public/modules/game/room-data.mjs` 与 `public/summit-spark.js` 导出的只读验证快照。浏览器直接导入房间数据模块；快照只供地图、路线和训练合同检查使用，不会被线上页面加载。

## 更新

```bash
node tools/export-room-data.js --write
npm run check
```

`--write` 负责规范化内容，禁止手工编辑 JSON。若脚本与快照不同步，默认质量门会失败。

## 后续边界

房间内容迁移已经完成。后续调整数据边界时仍应在一个聚焦改动中同时完成：

- 运行时数据模块与调用点切换；
- 十房人工试玩；
- 快照生成路径调整；
- 一步可回滚方案。

不增加兼容层、补丁生成器或第二套房间常量。
