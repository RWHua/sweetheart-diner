const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
  enableTelemetry: false,
});

/**
 * 参数校验
 */
function validOrder(order) {
  if (!order || typeof order !== 'object' || !Array.isArray(order.items) || order.items.length === 0) return false;
  if (typeof order.total !== 'number' || !Number.isFinite(order.total) || order.total < 0) return false;
  return order.items.every(item =>
    item && typeof item.name === 'string' && item.name.trim().length > 0 &&
    Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99 &&
    typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0
  );
}

/**
 * 格式化订单通知文本
 */
function formatOrder(order) {
  const lines = [
    '💕 新订单｜专属点餐',
    `订单号：${order.orderId}`,
    `下单时间：${order.clientTime || new Date().toISOString()}`,
    '',
    ...order.items.map(item => `· ${item.name} × ${item.quantity}（¥${(item.price * item.quantity).toFixed(0)}）`),
    '',
    `合计：¥${order.total.toFixed(0)}`
  ];
  if (order.note) lines.push(`备注：${String(order.note).slice(0, 500)}`);
  return lines.join('\n');
}

/**
 * 获取飞书 tenant_access_token（带缓存）
 */
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

/**
 * 发送飞书群消息
 */
async function sendFeishuMessage(content) {
  const appId = process.env.FEISHU_APP_ID;
  const chatId = process.env.FEISHU_CHAT_ID;
  if (!appId || !chatId) return { ok: false, error: `配置缺失: APP_ID=${!!appId} CHAT_ID=${!!chatId}` };
  try {
    const token = await getTenantToken();
    const res = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ receive_id: chatId, msg_type: 'text', content: JSON.stringify({ text: content }) })
    });
    const data = await res.json();
    if (data.code !== 0) return { ok: false, error: `飞书API错误 code=${data.code} msg=${data.msg}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Vercel Function Handler
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ code: -1, msg: '仅支持POST请求' });

  try {
    const order = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!validOrder(order)) return res.status(400).json({ code: -1, msg: '订单数据格式不正确' });

    const orderId = order.orderId || `order:${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);
    const orderRecord = { ...order, orderId, serverTime: new Date().toISOString() };

    // 存入 Redis
    await redis.set(orderId, orderRecord);
    await redis.lpush('orders:list', orderId);
    await redis.lpush(`orders:${today}`, orderId);

    // 飞书通知
    const feishuResult = await sendFeishuMessage(formatOrder(orderRecord));

    return res.status(200).json({ code: 0, msg: '提交成功', feishu: feishuResult });
  } catch (error) {
    console.error('submit-order error:', error);
    return res.status(500).json({ code: -1, msg: error.message || '服务器处理失败' });
  }
};
