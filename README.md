# Sweetheart Diner

给女朋友做的移动端点菜 H5 小馆。

**线上地址：https://sweetheart.fun**

## 功能

- 菜单：12 个菜系 55 道菜，含菜品详情、做法步骤、烹饪贴士、营养占比、评分
- 点菜：购物车（localStorage，key `sweetheart-cart`）、加料选项、下单
- 订单：实时推送到飞书；订单历史查看 / 删除
- 每日塔罗：独立页 `tarot.html`，22 张大阿尔克那纳，每日一抽锁定
- 首页主题按时段变色（晨 / 午 / 暮 / 夜）

## 技术栈

| 层 | 方案 |
|---|---|
| 前端 | 单文件 `index.html`（Tailwind CDN + 原生 JS） |
| 后端 | Vercel Functions（Node.js，CJS），`api/*.js` |
| 数据 | Upstash Redis |
| 通知 | 飞书开放平台 |
| 托管 | Vercel（git push 自动部署） |
| 域名 | 阿里云 `sweetheart.fun` 绑定 Vercel |

## 部署

```bash
git push origin master
```

Vercel 监听 master 分支，push 后自动构建上线（约 1-2 分钟）。注意：vercel.app 默认域名在国内网络不可达，日常访问用 sweetheart.fun。

## 加新菜

1. 图片：`images/{pinyinid}.jpg`（1024×1024，黑色陶瓷盘 + 暗色背景）
2. 数据：`index.html` 的 `menuList` 数组末尾追加菜品对象（id / category / name / desc / img / ingredients / detail / nutrition / taste / steps / tips）
3. push 即上线

完整流程（菜系归类验证、做法三源交叉搜索、AI 生图规范、四维评分）见 Hermes skill `sweetheart-add-dish`。

## 目录结构

```
index.html          主应用（菜单 + 购物车 + 订单）
tarot.html          每日塔罗独立页
api/                Vercel Functions（下单 / 查单 / 删单 / 飞书通知）
images/             菜品图 + 塔罗牌面
vercel.json         Functions 配置
overview.md         塔罗功能交付总览
CLAUDE.md           编码 agent 项目约束
```

## 本地预览

```bash
python -m http.server 8765
# 打开 http://127.0.0.1:8765
```
