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
│  │  ├─ format.mjs         # 无 DOM 的时间、评级与安全文本纯函数
│  │  └─ math.mjs           # 无状态的矩形判定、距离与数值逼近
│  ├─ modules/game/
│  │  └─ room-data.mjs      # 递归冻结的地图、章节、路线与氛围内容
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

`public/summit-spark.js` 仍包含输入、物理、渲染、训练、存档和账号逻辑。三个低风险切片已迁出格式、安全文本、矩形判定、距离、数值逼近与只读房间内容，并由独立 Node 契约与浏览器启动回归保护；其余高耦合领域仍等待对应证据后逐步拆分。

短期修改遵守：

- 不在同一改动中同时移动代码并改变玩法。
- 存档、输入、物理和云同步改动必须运行浏览器回归。
- 只读数据和纯函数先拆；DOM、存档、输入、物理、渲染后拆。
- 每次拆分必须有可单独回滚的提交。

## 下一阶段拆分顺序

只有真正开始迁移后续领域时才创建对应目录，目标位于 `public/modules/`：

`core/format.mjs`、`core/math.mjs` 与 `game/room-data.mjs` 已完成。接下来的顺序是：

1. `systems/storage.mjs`：规范化、事务写入、备份与迁移。
2. `systems/input.mjs`：键盘、触控、手柄和输入缓冲。
3. `training/`：Drill、Route、Feel 和 Focus 纯状态计算。
4. `ui/`：面板和 HUD 的 DOM 更新。
5. `game/physics.mjs` 与 `render/`：最后移动，并要求完整人工通关。

首次模块化应采用原生 ES modules，不引入构建器。若以后需要 TypeScript、打包或代码分割，先写独立架构决策并证明部署、源码映射和回滚路径。

## 删除策略

可以删除：

- 没有运行时或质量门消费者的脚手架；
- 已完成任务的一次性补丁和生成器；
- 与 `CHANGELOG.md` 重复的 README 历史；
- 重复入口和重复说明文档。

暂不删除：

- `CHANGELOG.md` 历史；
- 人工试玩和已知问题清单；
- 固定 SDK 的许可证；
- 能捕获真实回归且由 `npm run check` 调用的工具。

删除应通过 Git 完成，确保可恢复；删除后必须运行完整质量门并检查 Pages 暂存包。
