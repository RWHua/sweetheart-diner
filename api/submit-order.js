/**
 * 参数校验
 */
function validOrder(order) {
  if (!order || typeof order !== 'object' || !Array.isArray(order.items) || order.items.length === 0) {
    return false;
  }
  if (typeof order.total !== 'number' || !Number.isFinite(order.total) || order.total < 0) {
    return false;
  }
  return order.items.every(item =>
    item
    && typeof item.name === 'string'
    && item.name.trim().length > 0
    && Number.isInteger(item.quantity)
    && item.quantity > 0
    && item.quantity <= 99
    && typeof item.price === 'number'
    && Number.isFinite(item.price)
    && item.price >= 0
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
  if (order.note) {
    lines.push(`备注：${String(order.note).slice(0, 500)}`);
  }
  return lines.join('\n');
}

/**
 * 获取飞书 tenant_access_token（带缓存）
 */
let cachedToken = null;
let tokenExpiresAt = 0;

async function getTenantToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET
    })
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`飞书鉴权失败：${data.msg}`);
  }
  cachedToken = data.tenant_access_token;
  tokenExpiresAt = Date.now() + (data.expire - 60) * 1000;
  return cachedToken;
}

/**
 * 通过飞书 API 发送消息（失败不阻塞订单）
 */
async function sendFeishuMessage(content) {
  const appId = process.env.FEISHU_APP_ID;
  const receiveId = process.env.FEISHU_RECEIVE_ID;
  if (!appId || !receiveId) {
    console.log('飞书配置缺失，跳过通知');
    return;
  }
  try {
    const token = await getTenantToken();
    const res = await fetch(
      `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receive_id: receiveId,
          msg_type: 'text',
          content: JSON.stringify({ text: content })
        })
      }
    );
    const data = await res.json();
    if (data.code !== 0) {
      console.error('飞书通知失败:', data.msg);
    } else {
      console.log('飞书通知发送成功');
    }
  } catch (err) {
    console.error('飞书通知异常:', err.message);
  }
}

/**
 * Vercel Function Handler (CommonJS)
 */
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ code: -1, msg: '仅支持POST请求' });
  }

  try {
    const order = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!validOrder(order)) {
      return res.status(400).json({ code: -1, msg: '订单数据格式不正确' });
    }

    const orderId = order.orderId || `order:${Date.now()}`;
    const orderRecord = {
      ...order,
      orderId,
      serverTime: new Date().toISOString()
    };

    // 飞书通知不阻塞订单提交
    sendFeishuMessage(formatOrder(orderRecord));

    return res.status(200).json({ code: 0, msg: '提交成功' });
  } catch (error) {
    console.error('submit-order error:', error);
    return res.status(500).json({ code: -1, msg: error.message || '服务器处理失败' });
  }
};
