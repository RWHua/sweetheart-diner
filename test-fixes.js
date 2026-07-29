/**
 * Bug 修复验证脚本
 * 测试三个修复点：orderText 解构、confirmRandom 选项、validOrder 校验
 */

const assert = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg); else console.log('  ✅ ' + msg); };

// ---- 模拟数据 ----
const menuList = [
  { id: 'huojimian', name: '火鸡面', price: 0, options: ['加鸡柳大人', '不加鸡柳大人'] },
  { id: 'gongbaojiding', name: '宫保鸡丁', price: 0 },
  { id: 'mapotofu', name: '麻婆豆腐', price: 0 },
];
const getDish = id => menuList.find(d => d.id === id);
const money = v => '¥' + v.toFixed(0);

// 模拟购物车：火鸡面+鸡柳大人 ×2，宫保鸡丁 ×1
const cart = {
  'huojimian::加鸡柳大人': 2,
  'gongbaojiding': 1,
};

// ---- 复刻 cartEntries ----
const cartEntries = () => Object.entries(cart)
  .filter(([, q]) => q > 0)
  .map(([key, q]) => {
    const [id, opt] = key.split('::');
    return { dish: getDish(id), quantity: q, option: opt || '', cartKey: key };
  })
  .filter(({ dish }) => dish);

const cartTotal = () => cartEntries().reduce((s, e) => s + e.dish.price * e.quantity, 0);

// ============================================================
// Test 1: orderText — 旧代码 vs 新代码
// ============================================================
console.log('\n📋 Test 1: orderText() 修复验证');

// ❌ 旧代码（Bug 版本）
const orderText_old = () => {
  return ['【专属点餐】',
    ...cartEntries().map(({ dish, q }) => dish.name + ' × ' + q),  // q = undefined!
    '合计：' + money(cartTotal())
  ].filter(Boolean).join('\n');
};

// ✅ 新代码（修复后）
const orderText_new = () => {
  return ['【专属点餐】',
    ...cartEntries().map(({ dish, quantity, option }) =>
      dish.name + (option ? '【' + option + '】' : '') + ' × ' + quantity),
    '合计：' + money(cartTotal())
  ].filter(Boolean).join('\n');
};

const old_result = orderText_old();
const new_result = orderText_new();

console.log('  旧代码输出:');
console.log('  ' + old_result.replace(/\n/g, '\n  '));
console.log('  新代码输出:');
console.log('  ' + new_result.replace(/\n/g, '\n  '));

assert(old_result.includes('undefined'), '旧代码确实显示 undefined（bug 已复现）');
assert(!new_result.includes('undefined'), '新代码不含 undefined');
assert(new_result.includes('【加鸡柳大人】'), '新代码包含选项「加鸡柳大人」');
assert(new_result.includes('× 2'), '新代码包含正确数量 2');

// ============================================================
// Test 2: confirmRandom — 旧代码 vs 新代码
// ============================================================
console.log('\n🎲 Test 2: confirmRandom() 修复验证');

let randomDish = getDish('huojimian'); // 随机到了火鸡面
let calledShowPicker = false;
let calledChangeQuantity = false;
let changedId = null;

function showOptionPicker(dish) { calledShowPicker = true; }
function changeQuantity(id, delta) { calledChangeQuantity = true; changedId = id; }

// ❌ 旧代码
calledShowPicker = false; calledChangeQuantity = false;
(function confirmRandom_old() {
  if (!randomDish) return;
  changeQuantity(randomDish.id, 1);  // 直接加，不弹选择器
})();
assert(calledChangeQuantity && !calledShowPicker, '旧代码：直接加购，不弹选择器（bug 已复现）');

// ✅ 新代码
calledShowPicker = false; calledChangeQuantity = false;
(function confirmRandom_new() {
  if (!randomDish) return;
  if (randomDish.options) {
    showOptionPicker(randomDish);
  } else {
    changeQuantity(randomDish.id, 1);
  }
})();
assert(!calledChangeQuantity && calledShowPicker, '新代码：有 options 时弹出选择器');

// 随机到无 options 的菜
randomDish = getDish('gongbaojiding');
calledShowPicker = false; calledChangeQuantity = false;
(function confirmRandom_new2() {
  if (!randomDish) return;
  if (randomDish.options) {
    showOptionPicker(randomDish);
  } else {
    changeQuantity(randomDish.id, 1);
  }
})();
assert(calledChangeQuantity, '新代码：无 options 时正常加购');

// ============================================================
// Test 3: validOrder — option 校验
// ============================================================
console.log('\n🔒 Test 3: validOrder() option 校验');

// ✅ 新代码
function validOrder(order) {
  if (!order || typeof order !== 'object' || !Array.isArray(order.items) || order.items.length === 0) return false;
  if (typeof order.total !== 'number' || !Number.isFinite(order.total) || order.total < 0) return false;
  return order.items.every(item =>
    item && typeof item.name === 'string' && item.name.trim().length > 0 &&
    Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99 &&
    typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0 &&
    (item.option === undefined || item.option === '' || typeof item.option === 'string')
  );
}

// 合法订单（空字符串 option）
assert(validOrder({
  items: [{ name: '火鸡面', quantity: 1, price: 0, option: '' }],
  total: 0
}), '空 option 合法');

// 合法订单（有字符串 option）
assert(validOrder({
  items: [{ name: '火鸡面', quantity: 1, price: 0, option: '加鸡柳大人' }],
  total: 0
}), '字符串 option 合法');

// 合法订单（无 option 字段）
assert(validOrder({
  items: [{ name: '宫保鸡丁', quantity: 1, price: 0 }],
  total: 0
}), '无 option 字段合法');

// 非法订单（option 是数字）
assert(!validOrder({
  items: [{ name: '火鸡面', quantity: 1, price: 0, option: 123 }],
  total: 0
}), '数字 option 被拒绝');

// 非法订单（option 是对象）
assert(!validOrder({
  items: [{ name: '火鸡面', quantity: 1, price: 0, option: { x: 1 } }],
  total: 0
}), '对象 option 被拒绝');

// ============================================================
// Test 4: submitOrder payload 包含 option（之前修的）
// ============================================================
console.log('\n📦 Test 4: submitOrder payload 包含 option');

const entries = cartEntries();
const payload = {
  items: entries.map(({ dish, quantity, option }) => ({
    id: dish.id, name: dish.name, price: dish.price, quantity,
    option: option || ''
  })),
  total: cartTotal()
};

const huojimianItem = payload.items.find(i => i.id === 'huojimian');
assert(huojimianItem.option === '加鸡柳大人', 'payload 中火鸡面 option 为「加鸡柳大人」');

const gbdItem = payload.items.find(i => i.id === 'gongbaojiding');
assert(gbdItem.option === '', '无选项菜品 option 为空字符串');

// ============================================================
console.log('\n🎉 全部测试通过！\n');
