const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
  enableTelemetry: false,
});

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ code: -1, msg: '仅支持POST' });

  try {
    const { orderId } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!orderId) return res.status(400).json({ code: -1, msg: '缺少 orderId' });

    // 删除订单数据 + 从列表中移除
    await redis.del(orderId);
    await redis.lrem('orders:list', 0, orderId);

    // 也尝试从当日列表中移除
    const today = new Date().toISOString().slice(0, 10);
    await redis.lrem(`orders:${today}`, 0, orderId);

    return res.status(200).json({ code: 0, msg: '已删除' });
  } catch (error) {
    return res.status(500).json({ code: -1, msg: error.message });
  }
};
