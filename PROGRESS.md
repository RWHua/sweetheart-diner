# PROGRESS.md — 每日塔罗（feat-tarot-v2）

> 按 SOUL.md 方法论维护：任何 Agent/子会话开工前先读本文件 + TAROT_SPEC.md

## 阶段状态

| 阶段 | 内容 | 状态 | 负责人 |
|------|------|------|--------|
| P0 | 需求规格书 TAROT_SPEC.md + 分支 feat-tarot-v2 | ✅ | 主会话 |
| P1a | 生图脚本 gen-tarot.js（21 张深蓝新艺术） | ✅ | OpenCode |
| P1b | 生图执行 21/21 + 重生成 4 张（3 通过 + 15-devil 五角星方向待用户拍板） | ✅ | 子 Agent |
| P1c | 质检 21 张（四维：水印/文字/元素/风格） | ✅ 17+3 PASS | 子 Agent |
| P1d | 图片处理 22 张 webp 入库（女祭司裁字 20%） | ✅ 2.3MB | OpenCode 脚本+主会话执行 |
| P2 | tarot.html 改造（新流程/按问题锁定/CSS叠字/SVG/toast/时区）+ index.html | ✅ 已审查 | OpenCode |
| P3 | API 验证：micu 链路 OK，**Vercel 需改 DEEPSEEK_MODEL=deepseek-v4-flash-0731**；max_tokens 900→2000 已修 | ⚠️ 待用户改 Vercel | 主会话 |
| P4 | 联调测试（本地冒烟过；真机/模拟器待用户） | ⏳ | 主会话+用户 |
| P5 | 合并 master + push | ⏳ 待 P4 | 主会话 |

## 已定决策（用户拍板）

1. 牌面风格：深蓝新艺术 + 金色藤蔓边框 + 复古线描，重做 21 张（女祭司用定稿图），禁止 AI 水印
2. 文字方案：方案 A —— 生图无文字，CSS 叠字（逆位只转图片层）
3. 三牌阵：保留完整功能，符合新流程，重点单抽
4. 玩法流程：选玩法 → 输入问题 → 洗牌 → 抽牌 → 翻牌 → 解读
5. 每日锁定：按问题每天一次（djb2 hash，sweetheart-tarot-q-<hash>）
6. 生图：OfoxAI（seedream-5.0-lite）
7. 代码：全部 OpenCode 执行；非代码 = 子 Agent
8. DeepSeek 解读：micu 中转（https://www.micuapi.ai/v1），**模型名必须带日期后缀 deepseek-v4-flash-0731**

## 关键资产

- 风格锚点：C:\Users\lenovo\AppData\Local\hermes\cache\images\img_5a81a6aaa1bb.jpg
- 入库牌面：images/tarot/*.webp（22 张，512×512，q82，总 2.3MB）
- 原图：C:/Users/lenovo/tmp/tarot-gen/*.png（重生成用）
- 质检报告：C:/Users/lenovo/tmp/tarot-qa-report.md
- 脚本：gen-tarot.js（全量生成）、regen-tarot.js（重生成）、process_tarot_imgs.py（入库处理）

## 已知问题 / 待办

- [ ] **15-devil 恶魔五角星方向**：重生成 2 次 AI 仍画正五角星（标准韦特应为倒五角星），已补火炬/无水印/无文字。待用户拍板：接受 or 再试
- [ ] **Vercel DEEPSEEK_MODEL**：用户需改为 deepseek-v4-flash-0731（当前配的 deepseek-v4-flash 会 503）
- [ ] P4 真机/模拟器验收（安卓）
- [ ] P5 合并 push

## 已知坑

- gateway 重启会杀掉子代理会话（delegate_task），但不会杀其派生的独立进程（node）——重启前确认无关键后台任务
- 生图 prompt 必须 no text/no watermark；每张生成后 vision 质检四维
- 女祭司定稿图文字条需裁 20%（12% 不够）
- micu 模型名必须带日期后缀（deepseek-v4-flash-0731 / deepseek-v4-pro-0813）
- curl -o /dev/null 在 MSYS 下误报 0B（write error 23），用 -o 实际文件验证
