/**
 * 飞书事件回调 - 调试版：回复所有消息
 */

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
  const res = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ receive_id: chatId, msg_type: 'text', content: JSON.stringify({ text }) })
  });
  const d = await res.json();
  console.log('reply result:', JSON.stringify(d));
}

module.exports = async function handler(req, res) {
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'invalid json' });
  }

  // URL 验证
  if (body && body.type === 'url_verification') {
    return res.status(200).json({ challenge: body.challenge });
  }

  // 收到任何事件都回复
  if (body && body.header && body.event) {
    console.log('Received event:', body.header.event_type);
    const event = body.event;
    if (event.message && event.message.chat_id) {
      const text = (() => {
        try { return JSON.parse(event.message.content).text || ''; } catch(e) { return ''; }
      })();
      replyToChat(event.message.chat_id, '收到！你说：「' + text + '」\n试试：@点菜助手 今日订单');
    }
  }

  return res.status(200).json({});
};
