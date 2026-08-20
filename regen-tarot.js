const API = 'https://api.ofox.io/v1/images/generations';
const KEY = process.env.OFX_API_KEY || 'sk-of-odRETTXAQExQWZoBxZGOmzyCbEVNuqDVSzstTlATQKdWvdqgRqwZlVXhddwoECiI';
const fs = require('fs');
const path = require('path');
const DIR = 'C:/Users/lenovo/tmp/tarot-gen';

const SUFFIX = [
  'Art Nouveau tarot illustration',
  'intricate golden vine border frame, deep navy blue night background',
  'vintage engraving linework, decorative mystical style, soft ambient light',
  'no text, no letters, no words, no numbers, no typography',
  'centered vertical composition, tall 2:3 portrait format'
].join(', ');

const cards = [
  { slug: '10-wheel', name: 'Wheel of Fortune', elements: 'wheel of fortune with geometric symbols, LARGE sphinx with human head and lion body sitting on top of the wheel, four winged creatures in clouds around, no letters' },
  { slug: '15-devil', name: 'The Devil', elements: 'horned devil on stone pedestal, a star with exactly five points and one point facing DOWNWARD floating above the devils head, same five-pointed star pointing down on the forehead, devil holding a torch, two chained figures seated below' },
  { slug: '21-world', name: 'The World', elements: 'dancing woman completely encircled by an oval wreath of green laurel leaves, four corners contain four creatures: eagle top-left, lion top-right, ox bottom-left, human-faced angel bottom-right' }
];

async function generateOnce(card) {
  const prompt = `${card.name}, ${card.elements}, ${SUFFIX}`;
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'volcengine/doubao-seedream-5.0-lite', prompt, n: 1, size: '1600x2400', response_format: 'url' })
  });
  if (res.status === 502) throw new Error('HTTP 502');
  const data = await res.json();
  if (!data.data?.[0]?.url) throw new Error(JSON.stringify(data).slice(0, 200));
  return data.data[0].url;
}

async function gen(card) {
  const url = await generateOnce(card);
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`image fetch HTTP ${imgRes.status}`);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const out = path.join(DIR, `${card.slug}.png`);
  fs.writeFileSync(out, buf);
  console.log(`OK ${card.slug} ${(buf.byteLength / 1024).toFixed(0)}KB`);
}

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  for (const card of cards) {
    let done = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await gen(card);
        done = true;
        break;
      } catch (e) {
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 5000));
        } else {
          console.log(`FAIL ${card.slug}: ${e.message}`);
        }
      }
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('ALL DONE');
})();
