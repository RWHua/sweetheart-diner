# 塔罗牌功能交付总览

## 交付内容
- **tarot.html**（新增）— 每日塔罗独立页：黑金雕版黑暗风、3D 洗牌→扇形铺牌→翻牌动画、移动端手势（滑动转牌阵 / 点选抽牌）、每日一抽锁定 + 圣三角（过去/现在/未来）牌阵、22 张大阿尔克那正逆位释义
- **images/tarot/**（新增 23 张 WebP）— 全套 22 张手绘牌面（A+B 融合风：黑底金线雕版）+ 全视之眼六芒星卡背，共 4.4MB
- **index.html**（1 处改动）— 首页顶部新增"每日塔罗"深色入口卡片

## 关键技术决策
- 手势：Pointer Events 自实现（参考 Hammer.js / AlloyFinger 判定模型），`touch-action: none` + `overscroll-behavior: none` + `env(safe-area-inset-*)`，兼容 Android 与 iPhone X（iOS 13+）
- 3D：CSS `preserve-3d` + `rotateY` 翻牌，零三方库
- 每日锁定：`localStorage` 按日期存储；正逆位 50% 随机，逆位牌面旋转 180° 展示
- 素材：AI 生成 1024×1536 PNG → Pillow 转 WebP（q82，体积降约 90%）

## 验证
- 本地服务（127.0.0.1:8765）页面与图片全部 200
- tarot.html 内联脚本语法校验通过

## 备注
- 设计原图（PNG）保留在 `design-concepts/` 供后续微调
- 卡背为 180° 旋转对称设计（塔罗惯例：正逆位不可从卡背分辨）
- 部署无需改动 vercel.json / api/，直接 push 即可
