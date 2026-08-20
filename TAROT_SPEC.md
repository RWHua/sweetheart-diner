# 每日塔罗功能需求规格书（TAROT_SPEC.md）

> 版本 1.0 · 2026-08-19 · 由 Hermes 主会话编写，供 OpenCode / 子 Agent 执行使用
> **执行者开工前必读本文档 + 项目根 PROGRESS.md；完工后按验收标准自查**

---

## 1. 目标

在 sweetheart.fun（sweetheart-diner 项目，Vercel 部署）实现「每日塔罗」功能：
- 首页新增「每日塔罗」入口 → 独立页面 tarot.html
- 玩法：**单抽**（每日一抽·今日运势）与**三牌阵**（过去·现在·未来）
- 流程（用户拍板）：**选玩法 → 输入问题 → 洗牌动画 → 抽牌 → 3D 翻牌 → 解读按钮 → AI 解读（DeepSeek v4-flash）**
- 每日锁定：**每个问题每天只能抽一次**（按问题维度锁定，不同问题可分别抽）
- 牌面风格（用户拍板）：**深蓝新艺术（Art Nouveau）+ 金色藤蔓边框 + 复古线描**，重做 22 张大阿卡纳，**绝不带 AI 生成水印**
- 文字方案（用户拍板）：**方案 A —— 生图无文字，牌名/罗马数字用 CSS 叠加**

## 2. 背景与可复用资产

### 2.1 现有代码（feat-tarot 分支，已审查，质量高可复用）

| 文件 | 状态 | 处理 |
|------|------|------|
| `tarot.html`（526 行） | 已有洗牌动画/扇形选牌/CSS 3D 翻牌/结果面板/AI 解读弹层/localStorage 安全读写 | **保留骨架，改造流程与锁定** |
| `api/interpret-tarot.js`（100 行） | DeepSeek AI 解读 proxy：key 只走环境变量（DEEPSEEK_API_KEY/BASE_URL/MODEL/UA）、输入校验、CORS、错误降级 | **基本不动**（已适配 micu 中转：Vercel 上 env 已配好） |
| `index.html` 入口卡片 | 已加「今日塔罗」卡片，但用 emoji 🔮 | **改造：emoji → SVG 线条图标**（项目 UI 约定：SVG 线条无 emoji，参照其他卡片样式） |
| `images/tarot/*.webp`（22 张黑金风） | 带"AI生成"水印 + 牌面烘焙文字，风格不符合新需求 | **废弃重做**（深蓝新艺术 + 无文字 + 无水印） |
| `DECK` 数据结构（tarot.html 内） | 22 张大阿卡纳：slug/num/cn/en/kw/up/rev 齐全 | **保留**（释义已是扩写版） |

### 2.2 关键资产路径

- **风格锚点图（女祭司定稿）**：`C:\Users\lenovo\AppData\Local\hermes\cache\images\img_5a81a6aaa1bb.jpg`
  - 深蓝夜空 + 新艺术金色藤蔓边框 + 复古线描，768×768，顶部有 "II / THE HIGH PRIESTESS" 文字条（**方案 A：入库前裁掉顶部文字条**）
- **生图 API 模式**（参考 `gen-images.js`）：`https://api.ofox.io/v1/images/generations`
  - model: `volcengine/doubao-seedream-5.0-lite`，size: `1024x1024`，response_format: `url`
  - key 在 `gen-images.js` 内已有（或环境变量 OFX_API_KEY）
- **本地临时目录**：`C:\Users\lenovo\tmp\tarot-gen\`（生图原图输出）

### 2.3 已知坑

- AI 生图文字不可靠（TORO 非 TORA 事件）→ 所以方案 A：生图 prompt 必须 **no text, no letters, no words**
- AI 生图可能带水印 → 每张生成后必须质检（vision 逐张查水印/文字/元素），有则重生成或处理
- 图片性能：入库统一 512×512 webp（手机 60fps），大图只做中间产物
- OpenRouter gemini 地区 403 不可用 → 生图只走 OfoxAI

## 3. 功能点与验收标准

### F1 首页入口
- index.html 首页房间卡片区新增「每日塔罗」卡片
- 图标：**SVG 线条图标（金色系 #a88ae0/#c9a96e 描边），禁止 emoji**
- 文案：pixel 字体标签 `TAROT` + 标题「今日塔罗」+ 副文案「抽一张牌，问问今天」
- 验收：点击进入 tarot.html

### F2 玩法选择（流程第 1 步）
- tarot.html 进入后首屏：**先选玩法**（不是直接抽）
- 两个按钮：`每日一抽 ✦ 今日运势`（单抽）/ `圣三角牌阵 ✦ 过去·现在·未来`（三牌阵）
- 验收：两按钮可见可点

### F3 问题输入（流程第 2 步）
- 选中玩法后 → 输入问题（textarea，maxlength 300，placeholder 如「例如：我们今天相处要注意什么？」）
- 空问题不可继续（按钮置灰或点击提示）
- 验收：输入问题后进入洗牌；空问题被拦截

### F4 洗牌动画（流程第 3 步）
- 输入问题后 → 洗牌动画（复用现有 shuffleL/shuffleR 双牌背摆动，~1.9s）
- 验收：动画播放后自动进入选牌

### F5 抽牌（流程第 4 步）
- **单抽**：保留现有 22 张扇形铺牌 + 左右滑动转牌阵 + 点选一张（复用现有 renderFan/pickCard）
- **三牌阵**：同扇形，连抽 3 张不重复（复用现有 mode='trio' 逻辑），顶部显示已抽牌与「过去/现在/未来」标签
- 正逆位：50% 随机
- 验收：单抽 1 张 / 三牌阵 3 张不重复；已抽牌淡出不可重复选

### F6 3D 翻牌
- 复用现有 `.card3d` CSS（preserve-3d + rotateY + backface-visibility），**零第三方库**
- 逆位：牌面图 rotate 180°（复用 `.reversed` 类）
- 验收：翻牌动画流畅；无 WebGL 依赖（天然兼容 iOS 15）

### F7 结果面板 + AI 解读
- 底部结果面板（复用 #sheet）：牌面缩略图 + 牌名（**CSS 叠字，金色衬线 Georgia/serif**）+ 关键词标签 + 正/逆位徽章 + 牌意文案
- 「🔮 解读牌意」按钮 → 弹层（复用 #readWrap）：
  - 弹层显示**已输入的问题**（可修改，改动后锁定键 hash 用新问题）
  - 点击解读 → POST `/api/interpret-tarot` `{question, cards:[{cn,en,reversed,kw,up,rev,position}]}`
  - loading 动画 → 显示解读（复用 renderReading 支持 **粗体/换行**，XSS 转义保留）
  - 失败：重试按钮 + 安全兜底文案
- 验收：解读按钮点击后返回 250 字左右解读；错误路径有兜底

### F8 每日锁定（按问题，核心改动）
- **存储结构**（localStorage）：
  ```json
  key: "sweetheart-tarot-q-<hash>"
  value: { "date": "2026-08-19", "mode": "daily|trio", "question": "…",
           "cards": [{"idx": 5, "reversed": false}], "reading": "可选缓存AI解读" }
  ```
- **hash 算法**：djb2（对 question 字符串，稳定、无依赖）
- **锁定规则**：
  - 输入问题后、洗牌前检查：`localStorage["sweetheart-tarot-q-<hash>"]` 存在且 `date === 今天` → **拦截**：提示「该问题今日已抽取过」，展示之前的结果（可看牌面+牌意，解读可选重新生成）
  - 不同问题 → 互不影响，各自可抽
  - 跨天 → 自动失效（date 不匹配）
- **现有 `sweetheart-tarot-daily`（按天锁定）逻辑删除**，替换为按问题锁定
- 验收：同问题当天第二次 → 拦截并展示旧结果；不同问题 → 正常流程；次日 → 可重新抽

### F9 三牌阵
- 走同一流程：选玩法→输问题→洗牌→抽 3 张→翻牌→结果面板（位置标签 过去/现在/未来）→ 解读（cards 带 position 字段）
- 验收：三牌阵完整可用，解读 prompt 带位置信息

### F10 CSS 叠字（牌面文字方案 A）
- 牌面图片**不含任何文字**（生图 + 裁字保证）
- 牌名（中文）+ 罗马数字/英文名：CSS 叠加在牌面顶部/底部，金色衬线（Georgia, serif），所有牌统一排版
- 逆位时：**只旋转图片层，文字层保持正向**（文字层与图片层分离）
- 验收：22 张牌文字统一、正确、无 AI 乱码

## 4. 生图规格（P1 素材阶段）

### 4.1 风格锚点
以女祭司定稿图（`img_5a81a6aaa1bb.jpg`）为基准：**深蓝夜空背景 + 新艺术风格 + 金色藤蔓边框 + 复古线描 + 韦特符号保留**。21 张（除女祭司外）按此风格生成。

### 4.2 Prompt 模板（统一后缀锁定风格）

```
[Tarot card name], [core scene elements], Art Nouveau tarot illustration,
intricate golden vine border frame, deep navy blue night background,
vintage engraving linework, decorative mystical style, soft ambient light,
no text, no letters, no words, no numbers, no typography,
centered vertical composition, square format
```

### 4.3 22 张牌清单（slug 与元素，与现有 DECK slug 一致）

| slug | 牌名 | 核心画面元素 |
|------|------|-------------|
| 00-fool | 愚人 | young traveler at cliff edge, white rose in hand, small white dog, bindle over shoulder, rising sun |
| 01-magician | 魔术师 | magician with infinity symbol above head, table with wand cup sword pentacle, red and white robes |
| 02-high-priestess | 女祭司 | **用定稿图**（裁顶部文字条） |
| 03-empress | 女皇 | empress on throne in wheat field, star crown, pomegranate pattern dress, scepter, venus symbol |
| 04-emperor | 皇帝 | emperor on stone throne, ram heads, orb and scepter, mountain backdrop |
| 05-hierophant | 教皇 | hierophant with triple crown, crossed keys, blessing gesture, two kneeling followers |
| 06-lovers | 恋人 | angel above couple, tree of life behind man, serpent tree behind woman, sun |
| 07-chariot | 战车 | armored warrior in chariot, black and white sphinxes, star canopy, city backdrop |
| 08-strength | 力量 | woman gently closing lion jaws, infinity symbol above head, white robe, flowers |
| 09-hermit | 隐士 | old hermit holding lantern with star inside, staff, snowy mountain peak |
| 10-wheel | 命运之轮 | wheel of fortune with symbols, sphinx on top, four creatures in clouds |
| 11-justice | 正义 | justice with sword and scales, red robe, purple curtain, two pillars |
| 12-hanged-man | 倒吊人 | man hanging upside down from T-shaped tree, halo around head, calm expression |
| 13-death | 死神 | death knight on white horse, black banner with white rose, distant sun between towers |
| 14-temperance | 节制 | angel pouring water between two cups, one foot in water one on land, path to distant hills |
| 15-devil | 恶魔 | devil on pedestal, chained man and woman, inverted pentagram, torch |
| 16-tower | 高塔 | tower struck by lightning, two figures falling, crown blown off, fire sparks |
| 17-star | 星星 | naked woman kneeling by pond, pouring water from two jugs, large eight-pointed star |
| 18-moon | 月亮 | moon with face, dog and wolf howling, crayfish emerging from water, two towers on path |
| 19-sun | 太阳 | large sun, child riding white horse, sunflowers, stone wall garden |
| 20-judgement | 审判 | angel blowing trumpet with cross banner, people rising from coffins, mountains |
| 21-world | 世界 | dancing woman in wreath, four creatures in corners, two wands |

### 4.4 生成与处理流水线
1. 写生图脚本 `gen-tarot.js`（Node，模式参照 gen-images.js）：21 张按模板生成 → 输出 `C:\Users\lenovo\tmp\tarot-gen\<slug>.png`（或 .jpg），每张间隔 2s，带重试（502 偶发）
2. 女祭司：定稿图裁顶部文字条（约顶部 12%，裁到 B/J 柱顶上方）
3. 图片处理脚本 `process-tarot-img.js`：每张 → 裁顶部预留文字区（若 AI 仍画了文字则裁掉）→ 居中 512×512 → 转 webp q82 → 输出 `images/tarot/<slug>.webp`
4. **质检**：每张 vision 检查 ①无水印 ②无文字/乱码 ③元素齐全 ④风格一致（与女祭司锚点对照）；不合格 → 重生成（≤2 次）
5. 卡背 `back.webp`：现有可复用（全视之眼六芒星，180° 旋转对称）——确认风格与新牌面协调，不协调则重绘

### 4.5 图片规格
- 入库：512×512 webp（q82，单张 ~150-230KB）
- 总预算：22 张 + 卡背 ≈ 4-5MB（与现有分支持平，可接受）

## 5. 技术约束

- **纯前端 + Serverless**：tarot.html 无后端依赖（除 /api/interpret-tarot）；图片静态资源
- **零第三方库**：CSS 3D 翻转，不用 Three.js（避免 iOS 15 WebGL2 泛光 bug）
- **移动端**：Pointer Events 手势（现有 gesture 层保留）；`touch-action: none`；安全区 env(safe-area-inset-*)
- **DECK 数据**：22 张大阿卡纳结构保留（slug 与图片文件名一致）
- **API 环境变量**（Vercel 已配好，本地测试需在 .env 或环境变量提供）：
  - `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL`（micu 中转）/ `DEEPSEEK_MODEL=deepseek-v4-flash`
  - 本地测试 interpret-tarot.js 时用 curl（urllib 会被 CF 拦）

## 6. 明确不做（范围外）

- 小阿卡纳 56 张（后续版本）
- 摄像头手势识别（iOS16+ 门槛）
- 多用户/账户体系
- 牌阵扩展（仅单抽 + 三牌阵）
- 首页之外的入口改造

## 6.5 追加功能（2026-08-20 用户新需求）

### F11 历史记录（塔罗首页右上角入口）
- tarot.html 首页（renderIntro）顶部右侧加「记录」图标按钮（SVG 线条风格，符合暗色 UI，不用 emoji）
- 点击打开历史面板（弹层，复用 readWrap/sheet 样式）：列表展示每次抽取记录：日期+时间、问题、牌（缩略图+中文名+正逆位徽章）、AI 解读内容
- 数据存储：localStorage key `sweetheart-tarot-history` = 数组 `[{id, date, time, mode, question, cards:[{idx, reversed}], reading}]`（id 可用时间戳）
- 抽牌完成（saveRecord 时）写入 history（reading 为空）；AI 解读成功（showReading 拿到 text 后）更新对应记录的 reading
- 历史面板支持：点击条目查看详情（展开完整解读）、提供「清空记录」按钮（二次确认）
- 注意与现有按问题锁定（sweetheart-tarot-q-<hash>）并存：锁定记录管"当天不能重抽"，history 管"长期记录"

### F12 重复问题提示（输入问题后）
- renderQuestion 输入框下加一行小字：「今日已问 N 个问题」（从 history 统计今天 date 匹配的记录数）
- confirmQuestion 确认时：若该问题今天已抽过（getLocked 命中）→ 用 toast 提示「该问题今天已问过，展示之前的结果」（替代原生 alert），随后展示历史结果（现有 renderResult(true) 逻辑）
- 若问题与历史中其他问题完全相同（跨天）→ toast 提示「这个问题之前问过（N 天前），结果在历史记录里」但不拦截，正常抽牌

### F13 牌面放大查看
- 翻牌结果（revealCardHTML 的 front face）和结果面板（sheet 缩略图）中的牌面可点击
- 点击 → 全屏放大弹层：#zoomWrap（遮罩 + 居中大图 + 右上角 ✕ 关闭按钮）
- 放大图下方显示：牌中文名 + 英文名 + 正/逆位徽章 + 关键词标签 + 牌意文案（up/rev）
- 弹层支持点击遮罩关闭；✕ 按钮明显

## 7. 执行顺序（阶段划分）

```
P0 本规格书 + 分支 feat-tarot-v2          ✅ 本文件
P1 生图脚本 gen-tarot.js                  → OpenCode
P1 生图 21 张 + 女祭司裁字 + 质检          → 子 Agent（跑脚本 + vision 质检）
P1 图片处理 512 webp 入库                  → OpenCode 写处理脚本 / 子 Agent 执行
P2 tarot.html 改造（F2-F10）+ index.html   → OpenCode（读本规格书）
P3 API 本地验证（curl）+ Vercel 环境确认   → 主会话
P4 联调测试（本地服务/安卓真机/iOS UA）    → 主会话 + 用户
P5 合并 feat-tarot-v2 → master + push      → 主会话
```

## 8. 验收方式

- 本地：`npx serve` 或 python http.server 跑通全流程（玩法选择→输问题→洗牌→抽牌→翻牌→解读）
- 真机：安卓手机浏览器全流程 + 触摸手势
- iOS：DevTools 模拟 iPhone UA 验证 CSS 翻牌与降级无报错
- 图片：22 张逐一 vision 质检报告（文字/水印/元素/风格四维）
- 锁定：同问题当天二次进入 → 拦截展示旧结果；跨天重置
- 用户最终验收通过后合并推送
