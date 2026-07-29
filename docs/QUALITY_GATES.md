# Quality gates

## 默认门

```bash
npm run check
```

覆盖：

- JavaScript 语法；
- 核心模块的时间、差值、评级、HTML 转义、矩形判定、距离和数值逼近行为；
- 房间模块的十房尺寸、集合对齐、嵌套只读性和终点归属；
- 粒子、残影、碎片和光轨的普通/舒缓/减少动态/低性能预算，以及万次追加压力边界；
- 存档模块的设置迁移、损坏 JSON 修复、数值边界、旧 Focus envelope、路线裁剪、档案/备份结构与失败回滚；
- 输入模块的手柄死区/阈值/漂移、方向合成、预设选择、键名显示与重复键交换；
- UI 展示模块的章节完成度、评级阈值和练习优先级排序；
- 文档与目录结构；
- 单一公开入口、CSP、资源版本和 Pages 包边界；
- Appwrite 最小服务面、认证策略和私有行权限；
- 房间数据、地图、路线、Feel 和训练状态；
- GitHub Actions 完整 SHA 固定；
- 本地 HTTP 安全头、方法限制和文件白名单。
- 版本化 ES 模块的路径、MIME 类型和公开资源白名单。

默认门不依赖浏览器可执行文件，适合 CI。

## 浏览器门

```bash
npm run browser-smoke
```

覆盖真实点击、键盘、Canvas 位移、账号恢复、OTP/密码流程 mock、云冲突、1MB 存档、原子回滚、移动端安全区、软键盘、焦点陷阱、手柄死区和低性能渲染预算。

以下区域改动必须运行浏览器门：

- `public/index.html` 或 `public/summit-spark.css`；
- 输入、存档、账号、云同步；
- 设置/练习/登顶面板；
- 移动端或可访问性；
- 游戏循环、Canvas 尺寸或渲染。

## 专项命令

```bash
npm run smoke
npm run route-audit
npm run state-check
node tools/export-room-data.js --check
node tools/report-room-data.js
```

## 人工门

自动化不能替代：

- 实体触控和手柄手感；
- 音量与疲劳感；
- R1–R10 连续通关和难度曲线；
- 部署后的真实 Pages 缓存与 Appwrite 邮件流程。

详见 `PLAYTEST_CHECKLIST.md` 和 `KNOWN_ISSUES.md`。

## 发布门

发布前至少完成：

1. `npm run check`
2. `npm run browser-smoke`
3. `git diff --check`
4. `node tools/export-room-data.js --check`
5. 确认 `public/index.html` 版本号与 CSS/JS query 一致
6. 确认 Pages workflow 只复制 `public/`
7. 确认 Pages workflow 的外部 Action 固定到完整 SHA，并原生使用 Node 24，不依赖旧版 Node 20 兼容覆盖
8. 推送后等待 GitHub Pages workflow 成功，且不出现 Node 20 Action 弃用警告
9. 在线检查构建号、开始按钮、Canvas、设置、账号 SDK 和移动端视口

失败时保留日志和最小复现，不通过跳过检查或删除断言来“修复”。
