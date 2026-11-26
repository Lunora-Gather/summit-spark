# 项目架构

《山巅微光》是可直接部署的 Canvas 静态应用。浏览器从一个页面启动游戏。主运行时调度每一帧，各领域模块提供规则、数据、绘制函数与存档操作。

## 当前目录

| 入口 | 职责 |
| --- | --- |
| [index.html](../public/index.html)、[样式表](../public/summit-spark.css) | 启动界面、Canvas、HUD、练习与设置面板。CSS 处理布局、交互状态和设备尺寸。 |
| [主运行时](../public/summit-spark.js) | 装载模块，持有本局状态，采集输入，推进物理和训练状态，将结果写入 Canvas、DOM、音频和存档。 |
| [game](../public/modules/game/) | `room-data.mjs` 定义地图、光阶和挑战。`world-model.mjs` 提供镜头、出入口和动态机关规则。`terrain-art.mjs` 绘制地形、绘制地图机关并计算可见尖刺的命中区域。同目录还管理微光回滚、地标进度、音效数据和视觉效果预算。 |
| [core](../public/modules/core/) | 固定步长预算、几何、计时与文本格式化。 |
| [systems](../public/modules/systems/) | `input.mjs` 负责动作映射与缓冲，`storage.mjs` 负责存档校验与恢复，`cloud-save.mjs` 使用调用方提供的 TablesDB 客户端执行同步事务。 |
| [training](../public/modules/training/)、[ui](../public/modules/ui/) | 计算练习状态、房间推荐、回放动作和展示数据。主运行时负责事件与实际界面更新。 |
| [assets](../public/assets/)、[vendor](../public/vendor/) | 章节插画、材质与图标，以及随游戏发布的 Appwrite SDK 和许可证。 |

## 依赖方向

- **游玩**　页面加载主脚本，主脚本导入 `public/modules/`。输入缓冲进入固定步长更新，碰撞与机关更新本局状态，随后绘制场景和 HUD。
- **存档**　进度先保存到浏览器。登录后可以按用户同步到 Appwrite 私有行，上传时检查版本，冲突时让玩家选择。游戏玩法不依赖网络。[云存档配置](APPWRITE_SETUP.md)
- **关卡维护**　浏览器直接读取房间模块。导出器读取同一模块和主脚本中的 Route 与 Feel 训练夹具，生成 `data/rooms.generated.json`。地图检查、路线审计和数据报告消费这份快照。[数据契约](DATA_CONTRACTS.md)
- **发布**　[本地服务器](../game-server.js)按白名单提供 `public/` 文件。Pages 工作流暂存和上传同一目录，部署后核对线上文件。[发布流程](../.github/workflows/pages.yml)

## 下一阶段拆分顺序

主脚本承担输入、碰撞、界面和存档的编排，是修改时最容易牵动多个系统的地方。改某个面板时，可以先将能独立验证的展示计算放入 `ui/`。涉及物理和渲染时，用同一条按键回放对照落点、失误和收集结果，再做对应房间的人工试玩。[质量门](QUALITY_GATES.md) · [试玩协议](PLAYTEST_PROTOCOL.md)

## 删除策略

检查运行时导入、动态资源路径、服务器白名单、工具与工作流后再删除文件。关卡插画、回放夹具、许可证和已提交的快照各有独立消费者。维护工具的调整用快照导出和完整质量检查验证，游戏资源的调整还需核对实际绘制。[维护工具](../tools/README.md)
