# 山巅微光 · Summit Spark

一款用 JavaScript 和 Canvas 制作的精密平台跳跃游戏。穿过青环，断桥会亮成能落脚的光阶。四幕十个房间藏着 12 枚微光。冲刺已满时拾起微光，可以再存一次冲刺，试着够到更高的落点。

[在线试玩](https://lunora-gather.github.io/summit-spark/)

## 开始攀登

首次点「开始攀登」即可以游客身份进入第一关。R4 起镜头随角色水平移动，点亮中段营灯后，失误可以从营灯再试。登顶时能看到用时、失误、微光和最长光继连锁。结算页也能带你回到漏收微光的房间。

| 动作 | 舒适键位 | 经典键位 |
| --- | --- | --- |
| 方向 | WASD | 方向键 |
| 跳跃 / 冲刺 / 抓墙 | 空格 / K / J | C / X / Z |
| 回声召回 | Q | Q |
| 回到检查点 / 重开本房 | R / T | R / T |
| 暂停 / 练习 | Esc / P | Esc / P |

支持手柄与触屏。触屏上可以横滑方向键转身，上下滑动选择斜向，再用另一根手指冲刺。设置里可以改键、调整触控大小、音量和辅助选项。

练习面板提供选房、地形预览、分房个人最佳成绩和路线影子。进度默认保存在浏览器内，可以导出备份，也可以登录后使用 Appwrite 私有云存档。反馈时可在设置里复制本地诊断快照。

## 快速开始

本地使用 Node.js 24，从仓库根目录启动静态服务器即可游玩。

```sh
npm start
```

[打开本地游戏](http://127.0.0.1:4173/)

## 仓库结构

| 位置 | 从这里改什么 |
| --- | --- |
| `public/index.html`、`public/summit-spark.css` | 菜单、HUD、表单和响应式布局 |
| `public/summit-spark.js` | 输入事件、固定步长更新、碰撞、绘制与界面交互 |
| `public/modules/game/` | 房间地图、光阶、镜头、地形绘制、营灯和微光规则 |
| `public/modules/core/`、`public/modules/systems/` | 数学与格式化、输入映射、本地存档和云同步 |
| `public/modules/training/`、`public/modules/ui/` | 练习目标、路线回放与界面展示数据 |
| `public/assets/`、`public/vendor/` | 游戏美术、固定版本的 Appwrite SDK 和许可证 |
| `data/`、`tools/` | 房间验证快照、导出工具、自动检查与 Safari 回放 |

修改关卡从 [room-data.mjs](public/modules/game/room-data.mjs) 入手。地图或训练合同有改动时，运行 `node tools/export-room-data.js --write` 更新快照。[架构说明](docs/ARCHITECTURE.md) · [房间数据契约](docs/DATA_CONTRACTS.md)

## 质量检查

```sh
npm run check
```

默认检查覆盖房间快照、地图与路线、输入和存档规则、静态资源与本地 HTTP 服务。桌面浏览器回归使用 macOS 系统 Safari。在 Safari 开发者设置开启「允许远程自动化」后运行以下命令。

```sh
npm ci
npm run test:safari
npm run browser-smoke
```

Safari 回归包含十关连续全收集回放。实体设备的拇指触达、手柄手感和音量平衡由人工试玩核验。[质量检查说明](docs/QUALITY_GATES.md) · [试玩清单](PLAYTEST_CHECKLIST.md) · [已知限制](KNOWN_ISSUES.md)

## 发布

合并到 `main` 后，GitHub Actions 先运行 Safari 回归和项目检查，再将 `public/` 发布到 GitHub Pages。部署步骤会执行 `npm run live-check`，逐文件核对线上资源与本地发布内容。游戏构建号可在 [页面入口](public/index.html) 的 `build-version` 查看。

[贡献指南](CONTRIBUTING.md) · [发布清单](RELEASE_CHECKLIST.md) · [版本记录](CHANGELOG.md) · [云存档配置](docs/APPWRITE_SETUP.md)
