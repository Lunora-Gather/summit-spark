# Architecture

《山巅微光》是无构建步骤的 Canvas 静态应用。短期目标是保持公开版本稳定，同时让文件职责、发布边界和下一步拆分顺序清晰可审查。

## 当前目录

```text
summit-spark/
├─ public/                  # 唯一可部署目录
│  ├─ index.html            # 唯一 HTML 入口
│  ├─ summit-spark.css      # UI、响应式与视觉
│  ├─ summit-spark.js       # 当前游戏运行时
│  ├─ modules/core/
│  │  ├─ format.mjs         # 无 DOM 的有限化计时/差值、本地时间、评级与安全文本纯函数
│  │  └─ math.mjs           # 无状态的矩形判定、距离与数值逼近
│  ├─ modules/game/
│  │  ├─ room-data.mjs      # 递归冻结的地图、章节、路线、氛围、地标与机制教学内容
│  │  ├─ world-model.mjs    # 可变房宽、镜头安全区、相位时序与巡游轨迹纯模型
│  │  ├─ effect-budget.mjs  # 长局视觉效果队列预算与保留最新反馈的裁剪规则
│  │  ├─ landmark-progress.mjs # 山门/旧峰当前尝试地标进度纯规则
│  │  ├─ audio-cues.mjs     # 四幕环境和弦、两段式换幕与登顶声纹
│  │  └─ lumen-progress.mjs # 本房微光在死亡/重试时的精确回滚规则
│  ├─ modules/systems/
│  │  ├─ storage.mjs        # 设置/存档迁移、精确同步比较、冲突保护、档案/备份与事务回滚
│  │  └─ input.mjs          # 三类设备状态、动作缓冲、手柄映射与键位规则
│  ├─ modules/training/
│  │  ├─ state.mjs          # Drill、Route、Feel、Focus、五类房间推荐、三步计划、挑战与转场纯规则
│  │  └─ replay.mjs         # PB 路线动作切换点与移动影子状态语义
│  ├─ modules/ui/
│  │  └─ presentation.mjs   # 章节、Drill 目标/简报、路线标签、练习/设备/存档/反馈摘要与报告模型
│  └─ vendor/               # 固定版本 Appwrite SDK 与许可证
├─ data/
│  └─ rooms.generated.json # 房间/训练数据验证快照，不参与运行
├─ tools/                   # 可执行质量门和共享验证器
├─ docs/                    # 长期有效的产品、架构、数据和发布文档
├─ .github/                 # Issue/PR 模板与两个 CI 工作流
├─ appwrite.config.json     # 可版本化的云端资源与最小权限策略
├─ game-server.js           # 只服务 public 白名单的本地服务器
└─ package.json             # 唯一命令入口
```

`src/` 空脚手架、双 HTML 入口、一次性迁移补丁和自动生成 PR 工作流已删除。目录只代表已经存在的代码，不再用空 README 假装模块化完成。

## 运行边界

- 浏览器只加载 `public/` 中的 HTML、CSS、JS 和固定 SDK。
- GitHub Pages 只上传 `public/` 的暂存副本，不上传仓库、文档、配置或工具。
- `game-server.js` 对外仍使用根路径 URL，但文件解析只能命中明确白名单。
- Appwrite 只承担账号与每用户私有云存档；游戏玩法不依赖网络。
- `data/rooms.generated.json` 是测试输入，不是线上数据源。

## 依赖方向

```text
public/index.html
  ├─ public/summit-spark.css
  ├─ public/vendor/appwrite-26.2.0.js（按需加载）
  └─ public/summit-spark.js
       ├─ public/modules/core/format.mjs
       ├─ public/modules/core/math.mjs
       ├─ public/modules/game/room-data.mjs
       ├─ public/modules/game/world-model.mjs
       ├─ public/modules/game/effect-budget.mjs
       ├─ public/modules/game/landmark-progress.mjs
       ├─ public/modules/game/audio-cues.mjs
       ├─ public/modules/game/lumen-progress.mjs
       ├─ public/modules/systems/storage.mjs
       ├─ public/modules/systems/input.mjs
       ├─ public/modules/training/state.mjs
       ├─ public/modules/training/replay.mjs
       ├─ public/modules/ui/presentation.mjs
       ├─ Canvas / DOM / WebAudio / 输入
       ├─ localStorage / sessionStorage
       └─ Appwrite Account + TablesDB

public/modules/game/room-data.mjs ─┐
public/summit-spark.js（Route/Feel）├─ tools/export-room-data.js
                                  └─ data/rooms.generated.json
                                       └─ 数据、地图、路线质量门
```

生产代码不得反向依赖 `tools/`、`docs/` 或 `data/rooms.generated.json`。质量工具可以读取生产代码，但必须通过共享读取器，避免多套解析逻辑。

## 当前单体边界

`public/summit-spark.js` 仍包含输入事件编排、物理碰撞、世界渲染、训练副作用、存档 UI/云编排和账号逻辑。低风险切片已迁出有限化计时/差值、本地云时间、安全文本、数学、只读房间内容、可变房宽与镜头/动态障碍纯规则、章节声纹、当前尝试地标进度、视觉效果队列预算、存档规则与云冲突保护、输入状态/缓冲/映射、训练纯状态、PB 路线动作语义及 UI 展示模型，并由独立 Node 契约与浏览器回归保护；其余高耦合领域仍等待人工完整通关证据后逐步拆分。

短期修改遵守：

- 不在同一改动中同时移动代码并改变玩法。
- 存档、输入、物理和云同步改动必须运行浏览器回归。
- 只读数据和纯函数先拆；DOM、存档、输入、物理、渲染后拆。
- 每次拆分必须有可单独回滚的提交。

## 下一阶段拆分顺序

只有真正开始迁移后续领域时才创建对应目录，目标位于 `public/modules/`：

`core/format.mjs`、`core/math.mjs`、`game/room-data.mjs`、`game/world-model.mjs`、`game/effect-budget.mjs`、`game/landmark-progress.mjs`、`game/audio-cues.mjs`、`game/lumen-progress.mjs`、`systems/storage.mjs`、`systems/input.mjs`、`training/state.mjs`、`training/replay.mjs` 与 `ui/presentation.mjs` 的首批低风险切片已完成；固定步长帧预算也已由 `core/math.mjs` 提供纯函数契约，主运行时只负责消费步数。p281–p285 的运行时收口继续把“重生可玩性”和“响应式布局”当成跨层契约：输入恢复、落点自愈、有限状态/集合恢复只由主运行时编排，纯模块不读取 DOM；移动端位置、触控最小尺寸、长重启稳定性与非有限状态恢复由同一套浏览器门禁验证。接下来的顺序是：

1. `ui/`：只在有直接消费者与契约时继续迁移无副作用的面板/HUD 展示模型，DOM 事件仍留主运行时。
2. `game/physics.mjs` 与 `render/`：最后移动，并要求完整人工通关。

首次模块化应采用原生 ES modules，不引入构建器。若以后需要 TypeScript、打包或代码分割，先写独立架构决策并证明部署、源码映射和回滚路径。

## 删除策略

可以删除：

- 没有运行时或质量门消费者的脚手架；
- 只为保留旧接口名而存在的空状态、空绘制钩子和空兼容函数；
- 已完成任务的一次性补丁和生成器；
- 与 `CHANGELOG.md` 重复的 README 历史；
- 重复入口和重复说明文档。

暂不删除：

- `CHANGELOG.md` 历史；
- 人工试玩和已知问题清单；
- 固定 SDK 的许可证；
- 能捕获真实回归且由 `npm run check` 调用的工具。

删除应通过 Git 完成，确保可恢复；删除后必须运行完整质量门并检查 Pages 暂存包。
质量门应保护仍存在的用户行为，或明确阻止已废弃管线复活；不得要求无消费者的空函数、模块导入或只写不读的顶层可变状态继续存在。
