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
  'centered vertical composition, square format'
].join(', ');

const cards = [
  { slug: '00-fool', name: 'The Fool', elements: 'young traveler at cliff edge, white rose in hand, small white dog, bindle over shoulder, rising sun' },
  { slug: '01-magician', name: 'The Magician', elements: 'magician with infinity symbol above head, table with wand cup sword pentacle, red and white robes' },
  { slug: '03-empress', name: 'The Empress', elements: 'empress on throne in wheat field, star crown, pomegranate pattern dress, scepter, venus symbol' },
  { slug: '04-emperor', name: 'The Emperor', elements: 'emperor on stone throne, ram heads, orb and scepter, mountain backdrop' },
  { slug: '05-hierophant', name: 'The Hierophant', elements: 'hierophant with triple crown, crossed keys, blessing gesture, two kneeling followers' },
  { slug: '06-lovers', name: 'The Lovers', elements: 'angel above couple, tree of life behind man, serpent tree behind woman, sun' },
  { slug: '07-chariot', name: 'The Chariot', elements: 'armored warrior in chariot, black and white sphinxes, star canopy, city backdrop' },
  { slug: '08-strength', name: 'Strength', elements: 'woman gently closing lion jaws, infinity symbol above head, white robe, flowers' },
  { slug: '09-hermit', name: 'The Hermit', elements: 'old hermit holding lantern with star inside, staff, snowy mountain peak' },
  { slug: '10-wheel', name: 'Wheel of Fortune', elements: 'wheel of fortune with symbols, sphinx on top, four creatures in clouds' },
  { slug: '11-justice', name: 'Justice', elements: 'justice with sword and scales, red robe, purple curtain, two pillars' },
  { slug: '12-hanged-man', name: 'The Hanged Man', elements: 'man hanging upside down from T-shaped tree, halo around head, calm expression' },
  { slug: '13-death', name: 'Death', elements: 'death knight on white horse, black banner with white rose, distant sun between towers' },
  { slug: '14-temperance', name: 'Temperance', elements: 'angel pouring water between two cups, one foot in water one on land, path to distant hills' },
  { slug: '15-devil', name: 'The Devil', elements: 'devil on pedestal, chained man and woman, inverted pentagram, torch' },
  { slug: '16-tower', name: 'The Tower', elements: 'tower struck by lightning, two figures falling, crown blown off, fire sparks' },
  { slug: '17-star', name: 'The Star', elements: 'naked woman kneeling by pond, pouring water from two jugs, large eight-pointed star' },
  { slug: '18-moon', name: 'The Moon', elements: 'moon with face, dog and wolf howling, crayfish emerging from water, two towers on path' },
  { slug: '19-sun', name: 'The Sun', elements: 'large sun, child riding white horse, sunflowers, stone wall garden' },
  { slug: '20-judgement', name: 'Judgement', elements: 'angel blowing trumpet with cross banner, people rising from coffins, mountains' },
  { slug: '21-world', name: 'The World', elements: 'dancing woman in wreath, four creatures in corners, two wands' }
];

async function generateOnce(card) {
  const prompt = `${card.name}, ${card.elements}, ${SUFFIX}`;
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'volcengine/doubao-seedream-5.0-lite', prompt, n: 1, size: '1024x1024', response_format: 'url' })
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
