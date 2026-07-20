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
 * 发送飞书 Webhook 通知
 */
async function sendWebhook(content) {
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
  if (!webhookUrl) return;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msg_type: 'text',
      content: { text: content }
    })
  });

  if (!response.ok) {
    throw new Error(`飞书通知失败（HTTP ${response.status}）`);
  }
}

/**
 * Vercel Function Handler
 */
export default async function handler(req, res) {
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

    // 使用前端生成的可读订单号，如 OD-20260718-143025-A3F
    const orderId = order.orderId || `order:${Date.now()}`;
    const orderRecord = {
      ...order,
      orderId,
      serverTime: new Date().toISOString()
    };

    // 发送飞书通知
    await sendWebhook(formatOrder(orderRecord));

    return res.status(200).json({ code: 0, msg: '提交成功' });
  } catch (error) {
    console.error('submit-order error:', error);
    return res.status(500).json({ code: -1, msg: error.message || '服务器处理失败' });
  }
}
