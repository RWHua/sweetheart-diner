const API = 'https://api.ofox.io/v1/images/generations';
const KEY = 'sk-of-odRETTXAQExQWZoBxZGOmzyCbEVNuqDVSzstTlATQKdWvdqgRqwZlVXhddwoECiI';
const DIR = '/d/VibeCoding/sweetheart-diner/images';

const dishes = [
  { name: 'guobaorou',  prompt: 'Guo Bao Rou Chinese Northeastern dish, crispy golden pork slices with sweet and sour glaze, carrot and ginger shreds, on a white oval plate, top-down food photography, dark moody background, steam rising, professional food magazine quality' },
  { name: 'donganji',   prompt: 'Dongan Ji Chinese Hunan dish, tender chicken pieces in spicy vinegar sauce with red chili peppers, ginger strips, green scallions, in a dark ceramic bowl, top-down food photo, dark background, glossy sauce, professional quality' },
  { name: 'tangcuyu',   prompt: 'Tang Cu Yu Chinese sweet and sour fish, whole carp with crispy golden skin, red sweet and sour sauce drizzled, pine nuts garnish, on a long white plate, top-down food photography, dark background, restaurant quality' },
  { name: 'peachtea',   prompt: 'Peach Oolong iced tea in a tall glass, fresh peach slices, mint leaves, amber tea color, ice cubes, condensation on glass, top-down drink photography, dark background, refreshing summer vibe, professional quality' },
  { name: 'tangyuan',   prompt: 'Osmanthus sweet rice balls in warm soup, white glutinous rice balls, goji berries, dried osmanthus flowers, golden soup in white bowl, top-down food photography, dark moody background, warm cozy lighting' },
  { name: 'danchaofan', prompt: 'Yangzhou fried rice Chinese dish, golden egg-coated rice grains, shrimp, green peas, corn, diced ham, in a white bowl, top-down food photography, dark background, steam, professional food magazine quality' },
  { name: 'xiaolongbao',prompt: 'Xiaolongbao Chinese soup dumplings, delicate thin-skinned dumplings with visible pleats, steam rising, in a bamboo steamer, dark wooden table, top-down food photography, dark background, professional restaurant quality' },
];

async function gen(dish) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'volcengine/doubao-seedream-5.0-lite', prompt: dish.prompt, n: 1, size: '1024x1024', response_format: 'url' })
  });
  const data = await res.json();
  if (!data.data?.[0]?.url) return console.log(`FAIL ${dish.name}:`, JSON.stringify(data).slice(0,200));
  
  const imgRes = await fetch(data.data[0].url);
  const buf = await imgRes.arrayBuffer();
  const path = `${DIR}/${dish.name}.jpg`;
  require('fs').writeFileSync(path, Buffer.from(buf));
  console.log(`OK ${dish.name} (${(buf.byteLength/1024).toFixed(0)}KB)`);
}

(async () => {
  for (const d of dishes) {
    await gen(d);
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('ALL DONE');
})();
