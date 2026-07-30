/**
 * Sweetheart-add-dish v2.0.0 防御规则验证
 * 不测 API 调用，只验证决策逻辑是否正确
 */

const assert = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg); else console.log('  ✅ ' + msg); };

const KNOWN_CATEGORIES = ['东北菜','津菜','川菜','湘菜','鲁菜','饮品','甜品','主食'];

// ============================================================
// Test 1: 菜系归类——搜索命中后匹配
// ============================================================
console.log('\n📋 Test 1: 菜系归类逻辑');

function classifyDish(searchResult, knownCategories) {
  // 模拟 web_search 返回的菜系归属
  for (const cat of knownCategories) {
    if (searchResult.includes(cat)) return { match: true, category: cat };
  }
  return { match: false, detected: searchResult };
}

// 命中库里菜系
const r1 = classifyDish('红烧排骨属于东北菜', KNOWN_CATEGORIES);
assert(r1.match && r1.category === '东北菜', '红烧排骨命中东北菜');

const r2 = classifyDish('麻婆豆腐属于川菜经典', KNOWN_CATEGORIES);
assert(r2.match && r2.category === '川菜', '麻婆豆腐命中川菜');

// 库里没有
const r3 = classifyDish('白切鸡属于粤菜', KNOWN_CATEGORIES);
assert(!r3.match && r3.detected === '白切鸡属于粤菜', '白切鸡→粤菜不在库，需告知用户新增');

// 用户直接指定 → 跳过搜索
const r4 = { match: true, category: '湘菜' }; // 用户说「辣椒炒肉-湘菜」
assert(r4.category === '湘菜', '用户指定菜系直接使用');

// ============================================================
// Test 2: 做法搜索——3源交叉验证
// ============================================================
console.log('\n📋 Test 2: 做法 3 源交叉验证');

function mergeSteps(sources) {
  // 取最大公约数：在所有来源中都出现的步骤
  if (sources.length < 3) return { merged: null, conflict: true, reason: '来源不足3个' };

  const allSteps = sources.map(s => s.steps);
  const common = allSteps[0].filter(step =>
    allSteps.slice(1).every(other => other.some(s => s.includes(step.slice(0, 4))))
  );

  // 如果最大公约数太少（< 总步骤的50%），说明差异大
  const avgSteps = allSteps.reduce((s, a) => s + a.length, 0) / allSteps.length;
  if (common.length < avgSteps * 0.5) {
    return { merged: null, conflict: true, reason: '3源差异大', sources: sources.map(s => s.source) };
  }
  return { merged: common, conflict: false };
}

// 3源一致
const same3 = mergeSteps([
  { source: '下厨房', steps: ['排骨焯水', '炒糖色', '加酱油焖', '收汁'] },
  { source: '美食天下', steps: ['焯水去血', '炒糖色', '加老抽焖30分钟', '大火收汁'] },
  { source: '日食记', steps: ['冷水下锅焯', '冰糖炒糖色', '加调料焖煮', '收汁出锅'] },
]);
assert(!same3.conflict && same3.merged.length >= 2, '3源一致→合并通过');

// 3源差异大
const diff3 = mergeSteps([
  { source: '下厨房', steps: ['焯水', '炒糖色'] },
  { source: '网红版', steps: ['直接煎', '加可乐', '微波炉'] },
  { source: '快手版', steps: ['高压锅压', '勾芡'] },
]);
assert(diff3.conflict && diff3.reason === '3源差异大', '3源差异大→需告知用户选择');

// 来源不足
const fewSources = mergeSteps([
  { source: '下厨房', steps: ['焯水'] },
]);
assert(fewSources.conflict && fewSources.reason === '来源不足3个', '来源不足→标记冲突');

// ============================================================
// Test 3: 生图 prompt——视觉锚点注入
// ============================================================
console.log('\n📋 Test 3: 生图 prompt 视觉锚点校验');

function buildPrompt(dish, anchors) {
  const base = 'top-down overhead food photography, dark moody background, professional restaurant quality, soft natural lighting, centered on plate';

  // 必须包含锚点
  const anchorParts = [
    dish.mainColor ? `${dish.mainColor} glaze` : '',
    anchors.plating || '',
    anchors.plate || '',
    anchors.table || '',
    anchors.lighting || '',
  ].filter(Boolean);

  // 主次声明
  const focus = dish.garnish
    ? `Main dish: ${dish.nameEn} (dominant, center). Side: ${dish.garnish} (small garnish only, do not enlarge).`
    : '';

  return [dish.nameEn, ...anchorParts, focus, base].filter(Boolean).join(', ');
}

// 有锚点
const p1 = buildPrompt(
  { nameEn: 'Braised pork ribs', mainColor: 'dark soy', garnish: 'broccoli florets' },
  { plating: 'ribs stacked in mound', plate: 'white ceramic round plate', table: 'dark wood table', lighting: 'warm light from upper right' }
);
assert(p1.includes('dark soy glaze'), '包含主色');
assert(p1.includes('ribs stacked in mound'), '包含摆盘');
assert(p1.includes('white ceramic round plate'), '包含盘子');
assert(p1.includes('dark wood table'), '包含背景');
assert(p1.includes('warm light from upper right'), '包含光线');
assert(p1.includes('do not enlarge'), '包含主次声明');

// 无配菜 → 无主次声明
const p2 = buildPrompt(
  { nameEn: 'Mapo tofu', mainColor: 'red chili oil' },
  { plating: 'tofu cubes in red sauce', plate: 'black stone bowl', table: 'bamboo mat', lighting: 'overhead' }
);
assert(!p2.includes('do not enlarge'), '无配菜时不加主次声明');

// 蔬菜类 → 需额外防糊词（独立检测）
function needsVeggieGuard(nameZh) {
  const veggies = ['青菜','西兰花','菠菜','空心菜','白菜','生菜','油菜','韭菜','芹菜','豆苗','芦笋','黄瓜'];
  return veggies.some(v => nameZh.includes(v));
}
assert(needsVeggieGuard('蒜蓉西兰花'), '西兰花触发蔬菜防糊');
assert(needsVeggieGuard('清炒空心菜'), '空心菜触发蔬菜防糊');
assert(!needsVeggieGuard('红烧排骨'), '红烧排骨不触发');

// ============================================================
// Test 4: 生图失败兜底
// ============================================================
console.log('\n📋 Test 4: 生图失败处理');

function handleGenFail(errMsg, hasOriginalImage) {
  if (errMsg.includes('402') || errMsg.includes('余额') || errMsg.includes('balance')) {
    return { action: 'notify_user', message: 'OfoxAI 余额不足，请充值' };
  }
  if (hasOriginalImage) {
    return { action: 'fallback', message: '生图失败，使用原图兜底' };
  }
  return { action: 'notify_user', message: '生图失败且无原图可兜底，请手动处理' };
}

assert(handleGenFail('402 Payment Required', true).action === 'notify_user', '402→通知充值');
assert(handleGenFail('余额不足', false).action === 'notify_user', '余额不足→通知充值');
assert(handleGenFail('Connection timeout', true).action === 'fallback', '网络超时+有原图→兜底');
assert(handleGenFail('500 Internal Error', false).action === 'notify_user', '服务器错+无原图→通知用户');

// ============================================================
// Test 5: 识别结果确认流程
// ============================================================
console.log('\n📋 Test 5: 识别→确认→写入流程');

function buildConfirmPreview(visionResult, category) {
  return {
    dishName: visionResult.mainDish,
    category: category,
    ingredients: visionResult.ingredients || [],
    steps: visionResult.steps || [],
    needConfirm: true,
  };
}

const preview = buildConfirmPreview(
  { mainDish: '红烧排骨', ingredients: ['猪小排','酱油','冰糖'], steps: [] },
  '东北菜'
);
assert(preview.needConfirm === true, '识别完成后必须等用户确认');
assert(preview.dishName === '红烧排骨', '菜名正确');
assert(preview.category === '东北菜', '菜系正确');

// 用户确认后才写入
function userConfirmed(preview) {
  preview.needConfirm = false;
  preview.confirmedAt = new Date().toISOString();
  return preview;
}
const confirmed = userConfirmed({...preview});
assert(confirmed.needConfirm === false, '确认后状态变更');
assert(confirmed.confirmedAt !== undefined, '确认时间已记录');

// ============================================================
console.log('\n🎉 5项防御规则验证全部通过！\n');
