/**
 * 塔罗牌意解读 API（Vercel Serverless）
 *
 * 安全设计：凭据只从环境变量读取，绝不写入代码 / 前端 / git。
 *   DEEPSEEK_API_KEY   —— DeepSeek 官方或中转站的 API Key（必填）
 *   DEEPSEEK_BASE_URL  —— 接口地址（可选，默认官方 https://api.deepseek.com；
 *                          中转站填自己的地址，如 https://your-relay.com/v1）
 *   DEEPSEEK_MODEL     —— 模型名（可选，默认 deepseek-v4-flash）
 *
 * 前端调用：POST /api/interpret-tarot
 *   body: { question: string, cards: [{ cn, en, reversed, kw, up, rev }] }
 *   返回: { code: 0, text: string } | { code: -1, msg: string }
 */
const DEEPSEEK_BASE = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const DEEPSEEK_URL = DEEPSEEK_BASE + '/chat/completions';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

function validBody(body) {
  if (!body || typeof body !== 'object') return false;
  if (typeof body.question !== 'string' || !body.question.trim()) return false;
  if (body.question.length > 300) return false;
  if (!Array.isArray(body.cards) || body.cards.length === 0 || body.cards.length > 3) return false;
  return body.cards.every(c => c && typeof c.cn === 'string' && typeof c.en === 'string');
}

function buildPrompt(body) {
  const cardsText = body.cards.map((c, i) => {
    const pos = c.position ? `（${c.position}）` : '';
    const dir = c.reversed ? '逆位' : '正位';
    const kw = Array.isArray(c.kw) && c.kw.length ? c.kw.join('、') : '';
    const meaning = c.reversed ? c.rev : c.up;
    return `${i + 1}. ${c.cn}${pos}（${c.en} · ${dir}）：关键词 ${kw}；牌意：${meaning}`;
  }).join('\n');

  return `你是「甜蜜食光」点餐小程序里一位温柔专业的塔罗解读师，说话亲切自然，语气像老朋友聊天，不故弄玄虚。
请围绕用户问题，结合下面抽到的牌，给出 250 字左右的解读：先一句话点出核心信息，再结合正/逆位给出今天相处与行动上的建议，最后用一句温暖的话收尾。
不用罗列牌面细节，直接给出人话解读。用户问题：${body.question}

本次抽到的牌：
${cardsText}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ code: -1, msg: '仅支持POST请求' });

  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ code: -1, msg: '解读服务未配置（缺少 DEEPSEEK_API_KEY 环境变量）' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!validBody(body)) return res.status(400).json({ code: -1, msg: '请求数据格式不正确' });

    const payload = {
      model: MODEL,
      messages: [
        { role: 'system', content: buildPrompt(body) }
      ],
      stream: false,
      max_tokens: 900
    };

    const upstream = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('deepseek error:', upstream.status, JSON.stringify(data).slice(0, 300));
      const msg = (data && data.error && data.error.message) || '模型服务暂时不可用';
      return res.status(200).json({ code: -1, msg: `解读失败：${msg}` });
    }

    const text = data.choices && data.choices[0] && data.choices[0].message
      ? (data.choices[0].message.content || '')
      : '';
    if (!text) return res.status(200).json({ code: -1, msg: '模型未返回内容，请稍后重试' });

    return res.status(200).json({ code: 0, text });
  } catch (error) {
    console.error('interpret-tarot error:', error.message);
    return res.status(500).json({ code: -1, msg: '服务器处理失败，请稍后重试' });
  }
};
