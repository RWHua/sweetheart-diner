/**
 * 飞书事件回调处理
 * URL 验证必须 3 秒内响应 → 先验证，再异步处理消息
 */

// 延迟加载 Redis（URL 验证不需要）
let redis = null;
function getRedis() {
  if (!redis) {
    const { Redis } = require('@upstash/redis');
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      enableTelemetry: false,
    });
  }
  return redis;
}

// 飞书 token 缓存
let cachedToken = null, tokenExpiresAt = 0;

async function getTenantToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: process.env.FEISHU_APP_ID, app_secret: process.env.FEISHU_APP_SECRET })
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg);
  cachedToken = data.tenant_access_token;
  tokenExpiresAt = Date.now() + (data.expire - 60) * 1000;
  return cachedToken;
}

async function replyToChat(chatId, text) {
  const token = await getTenantToken();
  await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ receive_id: chatId, msg_type: 'text', content: JSON.stringify({ text }) })
  });
}

function parseText(content) {
  try { const p = JSON.parse(content); return (p.text || '').replace(/@\S+/g, '').trim(); } catch (e) { return ''; }
}

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

async function handleCommand(chatId, command) {
  const rds = getRedis();
  const cmd = command.toLowerCase().trim();

  if (cmd.includes('今日订单') || cmd.includes('今天')) {
    const today = new Date().toISOString().slice(0, 10);
    const ids = await rds.lrange(`orders:${today}`, 0, -1);
    const records = [];
    for (const id of ids) { const r = await rds.get(id); if (r) records.push(typeof r === 'string' ? JSON.parse(r) : r); }
    await replyToChat(chatId, formatOrderList(records, '📋 今日订单'));
  } else if (cmd.includes('全部订单') || cmd.includes('所有订单') || cmd.includes('历史')) {
    const ids = await rds.lrange('orders:list', 0, 49);
    const records = [];
    for (const id of ids) { const r = await rds.get(id); if (r) records.push(typeof r === 'string' ? JSON.parse(r) : r); }
    await replyToChat(chatId, formatOrderList(records.reverse(), '📋 全部订单（最近50单）'));
  } else if (cmd.includes('帮助') || cmd.includes('help') || cmd === '') {
    await replyToChat(chatId, '🍽️ 点菜助手 使用指南\n——\n· @点菜助手 今日订单 — 查看今天点了什么\n· @点菜助手 全部订单 — 查看历史订单\n· @点菜助手 帮助 — 显示本消息');
  } else if (cmd.includes('hi') || cmd.includes('你好') || cmd.includes('在吗')) {
    await replyToChat(chatId, '我在～ 试试 @点菜助手 帮助 看看我能做什么 💕');
  }
}

module.exports = async function handler(req, res) {
  // URL 验证优先处理（3秒内必须响应）
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'invalid json' });
  }

  if (body && body.type === 'url_verification') {
    return res.status(200).json({ challenge: body.challenge });
  }

  // 消息事件 — 异步处理
  if (body && body.header && body.header.event_type === 'im.message.receive_v1') {
    const event = body.event;
    if (event && event.message) {
      const chatId = event.message.chat_id;
      const text = parseText(event.message.content);
      handleCommand(chatId, text).catch(err => console.error('bot error:', err));
    }
  }

  return res.status(200).json({});
};
