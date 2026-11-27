# 山巅微光 · Summit Spark

一款用 JavaScript 和 Canvas 制作的精密平台跳跃游戏。高速穿过带双刻痕的青环，断桥会亮成能落脚的光阶。四幕十个房间藏着 12 枚微光。冲刺已满时拾起微光，可以再存一次冲刺，够到更高的落点。

[在线试玩](https://lunora-gather.github.io/summit-spark/)

## 开始攀登

首次点「开始攀登」就能进入第一关。向右走，用普通跳越过第一道山隙。R4 起房间变长，点亮中段营灯后，按 R 从营灯再试，按 T 从本房起点重新计时。

| 动作 | 舒适键位 | 经典键位 |
| --- | --- | --- |
| 方向 | WASD | 方向键 |
| 跳跃 / 冲刺 / 抓墙 | 空格 / K / J | C / X / Z |
| 回声召回 | Q | Q |
| 回到检查点 / 重开本房 | R / T | R / T |
| 暂停 / 练习 | Esc / P | Esc / P |

支持手柄与触屏。触屏上可以横滑方向键转身，上下滑动选择斜向，再用另一根手指冲刺。设置里可以改键、调整触控大小、音量和辅助选项。

登顶结算会显示用时、失误、微光和最长连锁。漏了微光，可以从结算页回到对应房间寻光。练习登顶也会显示实际收集数，全程纪录则从正式攀登计算。想练某一跳，可以在练习面板选房、展开地形图，或跟随分房最佳路线的影子再跑一次。

进度默认保存在当前浏览器。换设备前可以在设置里导出备份，也可以登录后使用 Appwrite 私有云存档。反馈问题时可在设置里复制本地诊断快照。

## 快速开始

准备 Node.js 24，在仓库根目录运行以下命令。游戏资源随仓库提供，启动后即可游玩。

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

默认检查会核对关卡快照、地图与路线、输入和存档规则，并启动临时本地服务检查游戏资源。

日常浏览器调试使用后台无窗口 WebKit，可以在测试期间继续使用 GPT 桌面应用。首次使用或锁定依赖更新后安装项目指定的 WebKit。之后只需运行最后一条命令，脚本会自行启动临时游戏服务，从游客入口走完十关并验证零失误收齐 12 枚微光。

```sh
npm ci
PLAYWRIGHT_SKIP_BROWSER_GC=1 npx --no-install playwright-core install webkit
npm run test:webkit
```

**发布前须用原生 Safari 验证。** 可以在远程 Mac 上运行，也可以在用户当次同意后在本机运行。启动、激活或操作用户本机 Safari 前，必须先询问并等用户明确同意，再在该次原生测试命令末尾加 `-- --allow-local-safari`。两处均未完成时，向用户报告「原生 Safari 验证仍待完成」。

PR 会在 GitHub 托管的 Mac 上运行 `npm run test:safari` 和 `npm run browser-smoke`，覆盖练习地图、存档与账号、R4 和 R3 的往返操作等场景。

实体设备的拇指触达、手柄手感和音量平衡由人工试玩核验。[质量检查说明](docs/QUALITY_GATES.md) · [试玩清单](PLAYTEST_CHECKLIST.md) · [已知限制](KNOWN_ISSUES.md)

## 发布

合并到 `main` 后，GitHub Actions 先运行 Safari 回归和项目检查，再将 `public/` 发布到 GitHub Pages。部署步骤会执行 `npm run live-check`，逐文件核对线上资源与本地发布内容。游戏构建号可在 [页面入口](public/index.html) 的 `build-version` 查看。

[贡献指南](CONTRIBUTING.md) · [发布清单](RELEASE_CHECKLIST.md) · [版本记录](CHANGELOG.md) · [云存档配置](docs/APPWRITE_SETUP.md)
