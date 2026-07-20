const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
  enableTelemetry: false,
});

// 飞书 token 缓存
let cachedToken = null;
let tokenExpiresAt = 0;

async function getTenantToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: process.env.FEISHU_APP_ID, app_secret: process.env.FEISHU_APP_SECRET })
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`飞书鉴权失败：${data.msg}`);
  cachedToken = data.tenant_access_token;
  tokenExpiresAt = Date.now() + (data.expire - 60) * 1000;
  return cachedToken;
}

/** 发消息到群 */
async function replyToChat(chatId, text) {
  const token = await getTenantToken();
  await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ receive_id: chatId, msg_type: 'text', content: JSON.stringify({ text }) })
  });
}

/** 解析消息中的纯文本（去掉 @mention） */
function parseText(content) {
  try {
    const parsed = JSON.parse(content);
    if (parsed.text) return parsed.text.replace(/@\S+/g, '').trim();
  } catch (e) {}
  return '';
}

/** 格式化订单列表 */
function formatOrderList(records, title) {
  if (!records || records.length === 0) return `${title}\n——\n暂无订单 🍽️`;
  const lines = [title, '——'];
  records.forEach((r, i) => {
    const time = (r.clientTime || r.serverTime || '').slice(11, 16);
    const items = (r.items || []).map(it => `${it.name}×${it.quantity}`).join('、');
    lines.push(`${i + 1}. [${time}] ${items}`);
    if (r.note) lines.push(`   备注：${r.note}`);
  });
  lines.push(`——\n共 ${records.length} 单`);
  return lines.join('\n');
}

/** 处理指令 */
async function handleCommand(chatId, command) {
  const cmd = command.toLowerCase().trim();

  if (cmd.includes('今日订单') || cmd.includes('今天')) {
    const today = new Date().toISOString().slice(0, 10);
    const ids = await redis.lrange(`orders:${today}`, 0, -1);
    const records = [];
    for (const id of ids) {
      const r = await redis.get(id);
      if (r) records.push(typeof r === 'string' ? JSON.parse(r) : r);
    }
    await replyToChat(chatId, formatOrderList(records, '📋 今日订单'));
    return;
  }

  if (cmd.includes('全部订单') || cmd.includes('所有订单') || cmd.includes('历史')) {
    const ids = await redis.lrange('orders:list', 0, 49);
    const records = [];
    for (const id of ids) {
      const r = await redis.get(id);
      if (r) records.push(typeof r === 'string' ? JSON.parse(r) : r);
    }
    await replyToChat(chatId, formatOrderList(records.reverse(), '📋 全部订单（最近50单）'));
    return;
  }

  if (cmd.includes('帮助') || cmd.includes('help') || cmd === '') {
    await replyToChat(chatId, [
      '🍽️ 点菜助手 使用指南',
      '——',
      '· @点菜助手 今日订单 — 查看今天点了什么',
      '· @点菜助手 全部订单 — 查看历史订单',
      '· @点菜助手 帮助 — 显示本消息',
    ].join('\n'));
    return;
  }

  // 默认回复
  if (cmd.includes('hi') || cmd.includes('你好') || cmd.includes('在吗')) {
    await replyToChat(chatId, '我在～ 试试 @点菜助手 帮助 看看我能做什么 💕');
    return;
  }
}

/**
 * Vercel Function Handler
 * 飞书事件订阅回调
 */
module.exports = async function handler(req, res) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  // URL 验证（首次配置时飞书会发送 challenge）
  if (body.type === 'url_verification') {
    return res.status(200).json({ challenge: body.challenge });
  }

  // 处理消息事件
  if (body.header && body.header.event_type === 'im.message.receive_v1') {
    const event = body.event;
    if (!event || !event.message) return res.status(200).json({});

    const chatId = event.message.chat_id;
    const text = parseText(event.message.content);

    // 异步处理指令，不阻塞飞书的 3 秒超时
    handleCommand(chatId, text).catch(err => console.error('bot error:', err));

    // 立即返回 200，飞书要求 3 秒内响应
    return res.status(200).json({});
  }

  return res.status(200).json({});
};
