# 山巅微光

原创精密平台跳跃游戏原型。十个房间围绕跳跃、冲刺、攀墙、光继点、风升流、超载棱镜、回声锚点和脆冰展开，并提供房间 PB、最佳路线影子、Focus 教练、Drill、Route contracts、Feel Lab、手柄与触控支持。

在线试玩：<https://lunora-gather.github.io/summit-spark/>

当前公开构建：`20260807-p261`

## 快速开始

需要 Node.js 24。

```bash
npm start
```

打开：

```text
http://127.0.0.1:4173/
```

项目无安装依赖、无构建步骤。浏览器运行文件全部位于 `public/`。

## 操作

| 动作 | 键盘 | 手柄 | 触控 |
| --- | --- | --- | --- |
| 移动/方向 | WASD 或方向键 | 左摇杆 / 十字键 | 方向组 |
| 跳跃 | Space / C / J | A | 跳 |
| 冲刺 | X / K / Shift | B / X / RT | 冲 |
| 抓墙 | Z / L / Ctrl | 肩键 / LT | 抓 |
| 快速下落 | S / ↓ | 下方向 | ↓ |
| 回声召回 | Q / Backspace | Y / Back | 召（回声房出现） |
| 快速重开 | R | — | — |
| 当前房重开 | T | — | — |
| 设置 | O / 右上角齿轮 | — | 右上角齿轮 |
| 练习 | P / 右上角练习按钮 | — | 右上角练习按钮 |
| 调试 | F3 | — | — |

设置中可以：

- 切换舒适/经典键位并自定义绑定；
- 选择抓墙按住或切换模式；
- 调整手柄死区、触控尺寸和低性能模式；
- 调整音量、练习线和 ghost 透明度；
- 开启“舒缓”辅助（85% 速度、双冲刺、无限体力）；辅助轮次不写入 PB、挑战、训练合同或长期纪录；
- 导出、导入和恢复本地存档；
- 复制仅含版本、设置摘要、进度摘要和视口信息的本地诊断快照；
- 使用邮箱 OTP 或密码登录并同步 Appwrite 私有云存档。

## 当前范围

- 10 个房间的 vertical slice，不是完整章节。
- 普通游玩保持安静 HUD；练习首屏只保留选房和训练记录，路线、手感、档案与长期目标按需展开。
- 存档以浏览器本地为主，登录后可同步到每用户私有 Appwrite 行。
- 不上传诊断、备注、手柄 ID、输入历史或路线原始数据。
- 暂不增加新房间、排行榜或第二套成就系统，先完成实体设备和完整通关验证。

人工验证边界见 [KNOWN_ISSUES.md](KNOWN_ISSUES.md)。

## 仓库结构

```text
public/                 可直接部署的唯一运行目录
  index.html            唯一页面入口
  summit-spark.css      UI、响应式与视觉
  summit-spark.js       当前游戏运行时
  modules/core/         有限化时间/差值、本地时间、安全文本与数学纯函数
  modules/game/         十房内容、章节声纹、地标进度与长局视觉效果预算
  modules/systems/      存档规则，以及手柄/键位输入映射
  modules/training/     训练状态、房间推荐、三步计划与 PB 路线动作语义
  modules/ui/           章节、Drill/路线标签、练习/设备摘要、预览与报告模型
  vendor/               固定 Appwrite SDK 与许可证
data/                   房间/训练数据验证快照
tools/                  自动质量门和共享验证器
docs/                   架构、数据、产品、质量和 Appwrite 文档
.github/                Issue/PR 模板与 CI/Pages 工作流
appwrite.config.json    云端资源和最小权限策略
game-server.js          public 白名单本地服务器
```

当前运行时主体仍是单体脚本；有限化时间/差值、本地云时间、安全文本、数学、只读房间内容、章节声纹、当前尝试地标进度、长局视觉效果预算、存档规则、设备无关的输入规则、训练状态、五类房间推荐与优先跨房的三步计划、PB 路线动作语义，以及章节成绩/收束、Drill/路线标签、房间训练/进度摘要、练习优先级、练习档案/长期挑战/手柄状态摘要、存档导入/备份摘要、反馈备注/模板、四幕汇总和隐私受限本轮报告等 UI 展示模型已迁入独立模块。后续只迁移有直接消费者和回归契约的 UI 纯模型；物理与渲染等十房人工基线完成后再动。完整边界见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 质量检查

默认发布门：

```bash
npm run check
```

真实浏览器回归：

```bash
npm run browser-smoke
```

部署后逐文件核对线上版本：

```bash
npm run live-check
```

专项检查：

```bash
npm run smoke
npm run route-audit
npm run state-check
npm run css-audit
node tools/export-room-data.js --check
node tools/report-room-data.js
```

`npm run check` 覆盖语法、目录结构、CSP、Pages 发布边界、Appwrite 策略、GitHub Actions SHA 固定与原生 Node 24 发布链、地图、路线、训练状态、视觉效果压力预算、存档契约和本地 HTTP 安全边界。浏览器回归覆盖真实 UI、账号 mock、云冲突、1MB 存档、原子回滚、移动端、Canvas、手柄死区，以及隐藏设置/练习面板的零 DOM 抖动。

详细说明见 [docs/QUALITY_GATES.md](docs/QUALITY_GATES.md)。
发布前人工路径见 [PLAYTEST_CHECKLIST.md](PLAYTEST_CHECKLIST.md)。

## 房间数据

地图、目标、章节文案、路线说明和 Style/Expert 合同的唯一运行时源是 `public/modules/game/room-data.mjs`；Route 与 Feel 的有状态训练夹具暂留在 `public/summit-spark.js`。`data/rooms.generated.json` 是自动生成的合并验证快照，不会被线上页面加载。

修改地图、路线或合同后：

```bash
node tools/export-room-data.js --write
npm run check
```

不要手工编辑快照。契约见 [docs/DATA_CONTRACTS.md](docs/DATA_CONTRACTS.md)。

## 账号与云存档

Appwrite 仅启用 Account、Database/TablesDB 和 REST：

- 邮箱 OTP 与邮箱密码登录；
- 用户 ID 作为存档行 ID；
- read/update/delete 仅授权该用户；
- 30 天会话、每账号最多 5 个会话；
- 常见密码、个人信息和最近 3 次密码检查；
- 新会话邮件提醒；
- 客户端与云端存档上限 1MB。

配置和发布方法见 [docs/APPWRITE_SETUP.md](docs/APPWRITE_SETUP.md)。

## 发布

推送 `main` 后，GitHub Pages workflow 会：

1. 运行文档、数据和完整质量门；
2. 只把 `public/` 复制到 `_site`；
3. 上传并部署 Pages artifact。

所有外部 GitHub Actions 固定到完整提交 SHA。发布前执行 [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)，部署后运行 `npm run live-check`，确认线上构建与本地 `public/` 完全一致。

## 文档

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：当前边界与后续拆分顺序
- [docs/CONTENT_BIBLE.md](docs/CONTENT_BIBLE.md)：产品定位、机制与内容规则
- [docs/DATA_CONTRACTS.md](docs/DATA_CONTRACTS.md)：地图和训练数据契约
- [docs/QUALITY_GATES.md](docs/QUALITY_GATES.md)：自动、浏览器、人工与发布门
- [docs/PLAYTEST_PROTOCOL.md](docs/PLAYTEST_PROTOCOL.md)：试玩记录方法
- [docs/APPWRITE_SETUP.md](docs/APPWRITE_SETUP.md)：账号和云存档配置
- [docs/OPTIMIZATION_ROADMAP.md](docs/OPTIMIZATION_ROADMAP.md)：尚未完成的优化路线
- [CHANGELOG.md](CHANGELOG.md)：完整版本历史

## 贡献

提交前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，保持改动聚焦，并说明：

- 是否改变玩法判定；
- 是否改变存档 schema；
- 运行了哪些质量门；
- 是否需要实体设备或完整通关复核。
