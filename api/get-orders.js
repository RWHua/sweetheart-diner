const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
  enableTelemetry: false,
});

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const url = new URL(req.url, 'http://localhost');
    const type = url.searchParams.get('type') || 'today'; // today | all

    let ids;
    if (type === 'all') {
      ids = await redis.lrange('orders:list', 0, -1);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      ids = await redis.lrange(`orders:${today}`, 0, -1);
    }

    const orders = [];
    for (const id of ids) {
      const r = await redis.get(id);
      if (r) orders.push(typeof r === 'string' ? JSON.parse(r) : r);
    }

    return res.status(200).json({ code: 0, orders: orders.reverse() });
  } catch (error) {
    return res.status(500).json({ code: -1, msg: error.message });
  }
};
