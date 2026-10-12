/* 变异测试：故意把功能弄坏，确认自检断言变红。
   用法（在任务文件夹内）：node tools/mutation_test.mjs
   判据与 pelican-bicycle.html 里 ?selftest=1 的判据完全一致（同一份代码、同一阈值）。
   结论写在 README：哪些变异被抓到、哪些抓不到、为什么。 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SRC = path.resolve(process.argv[2] || 'pelican-bicycle.html');
const TMP = path.resolve('_mut');
fs.mkdirSync(TMP, { recursive: true });
const base = fs.readFileSync(SRC, 'utf8');

function selfTest(file) {
  const url = 'file:///' + file.replace(/\\/g, '/') + '?selftest=1&paused=1';
  const dom = execFileSync(CHROME,
    ['--headless=new', '--disable-gpu', '--dump-dom', '--virtual-time-budget=2500', url],
    { maxBuffer: 64 * 1024 * 1024 }).toString();
  const m = dom.match(/<pre id="selftest">([\s\S]*?)<\/pre>/);
  if (!m) return { ok: false, fails: ['<selftest 块没产生：页面报错或脚本没跑>'] };
  const lines = m[1].split('\n').filter(l => /^(PASS|FAIL)/.test(l));
  return { ok: true, total: lines.length, fails: lines.filter(l => l.startsWith('FAIL')).map(l => l.slice(5).split(' :: ')[0]) };
}

/* 每个变异 = 一处源码改动。find 必须在源码里唯一出现，否则脚本直接报错。 */
const MUTATIONS = [
  { name: 'M1 膝盖选反解（反关节）',
    find: `const knee = (k1.x > k2.x) ? k1 : k2;`,
    repl: `const knee = (k1.x > k2.x) ? k2 : k1;` },

  { name: 'M2 后轮不再旋转',
    find: `  $('wheelRear').setAttribute('transform', \`rotate(\${wheelDeg.toFixed(2)} 330 368)\`);`,
    repl: `  // 变异：不更新后轮` },

  { name: 'M3 腿太短够不到踏板',
    find: `const L_THIGH   = 62, L_SHIN = 62;`,
    repl: `const L_THIGH   = 40, L_SHIN = 40;` },

  { name: 'M4 大腿不更新（僵腿）',
    find: `  $('thighNear').setAttribute('d', \`M\${HIP.x} \${HIP.y} L \${near.knee.x.toFixed(2)} \${near.knee.y.toFixed(2)}\`);`,
    repl: `  // 变异：不更新大腿` },

  { name: 'M5 视差不做周期取模（瓦片飞走）',
    find: `  const wrap = (v, w) => ((-v) % w + w) % w;`,
    repl: `  const wrap = (v, w) => (-v);` },

  { name: 'M6 灌木周期不整除瓦片宽（接缝断裂）',
    find: `  const period = 80, amp = 22, base = 422;`,
    repl: `  const period = 70, amp = 22, base = 422;` },

  { name: 'M7 速度读数不再更新（装饰性文本）',
    find: `  speedOut.textContent = (state.speed / PX_PER_M * 3.6).toFixed(1) + ' km/h';`,
    repl: `  // 变异：不更新读数` },

  { name: 'M8 脚不跟踏板（脚钉死）',
    find: `  $('footNear').setAttribute('transform',
    \`translate(\${near.foot.x.toFixed(2)} \${near.foot.y.toFixed(2)}) rotate(\${tilt(angN).toFixed(2)})\`);`,
    repl: `  // 变异：不移动脚` },

  { name: 'M9 喉囊摆动写死为 1（无鼓动）',
    find: `  const pouchS = 1 + 0.11 * Math.sin(crankRad * 2 - 0.7);`,
    repl: `  const pouchS = 1;` },

  { name: 'M10 太阳光芒动画未定义（只留 reduced-motion 例外）',
    find: `    animation: sunspin 70s linear infinite;`,
    repl: `    /* 变异：不定义动画 */` },

  // ↓ 以下 8 个对应独立审计抓到的缺陷（审计前这些功能坏掉时测试依然全绿）
  { name: 'M11 尘土 scale 绕 SVG 原点（尘土飞到天空/山丘）',
    find: `    return \`translate(\${(c.x - ph * 90).toFixed(1)} \${(c.y - ph * 26).toFixed(1)}) \` +
           \`scale(\${(0.6 + ph).toFixed(2)}) translate(\${-c.x} \${-c.y})\`;`,
    repl: `    return \`translate(\${(-ph * 90).toFixed(1)} \${(-ph * 26).toFixed(1)}) scale(\${(0.6 + ph).toFixed(2)})\`;` },

  { name: 'M12 起伏作用到整车（轮子被抬离地面）',
    find: `  $('torso').setAttribute('transform', \`translate(0 \${bob.toFixed(2)}) rotate(\${lean.toFixed(2)} 400 262)\`);`,
    repl: `  $('rider').setAttribute('transform', \`translate(0 \${bob.toFixed(2)}) rotate(\${lean.toFixed(2)} 430 355)\`);` },

  { name: 'M13 脚掌按小腿整轴旋转（脚吊在踏板下方）',
    find: `    \`translate(\${near.foot.x.toFixed(2)} \${near.foot.y.toFixed(2)}) rotate(\${tilt(angN).toFixed(2)})\`);`,
    repl: `    \`translate(\${near.foot.x.toFixed(2)} \${near.foot.y.toFixed(2)}) rotate(\${angN.toFixed(2)})\`);` },

  { name: 'M14 翅膀改回墙钟时间驱动（停车仍拍翅）',
    find: `  const flap = 7 * Math.sin(crankRad * 1.5 + 0.4);`,
    repl: `  const flap = 7 * Math.sin(state.t * 3.1 + 0.4);` },

  { name: 'M15 鱼画在筐前壁之后（鱼摆在筐盖上）',
    find: `        <g id="fish">
          <path d="M552 250 C 562 238, 576 238, 584 248 C 576 256, 562 256, 552 250 Z" fill="#7fb6d4" stroke="#4f87a8" stroke-width="2"/>
          <path d="M584 248 L 592 240 L 588 256 Z" fill="#7fb6d4" stroke="#4f87a8" stroke-width="2"/>
        </g>
        <path id="basketWall" d="M540 258 L 592 258 L 586 296 L 546 296 Z" fill="#c98a4b" stroke="#9c6631" stroke-width="3"/>`,
    repl: `        <path id="basketWall" d="M540 258 L 592 258 L 586 296 L 546 296 Z" fill="#c98a4b" stroke="#9c6631" stroke-width="3"/>
        <g id="fish">
          <path d="M552 250 C 562 238, 576 238, 584 248 C 576 256, 562 256, 552 250 Z" fill="#7fb6d4" stroke="#4f87a8" stroke-width="2"/>
          <path d="M584 248 L 592 240 L 588 256 Z" fill="#7fb6d4" stroke="#4f87a8" stroke-width="2"/>
        </g>` },

  { name: 'M16 铃的抖动被音频成功门控（无音频即无反馈）',
    find: `  bellShake();
  try {`,
    repl: `  // 变异：只有音频可用才做视觉反馈
  if (audioCtx) bellShake();
  try {` },

  { name: 'M17 眼皮只有 6px 高（闭眼像眉毛）',
    find: `        <path id="lid" d="M502 124 A 10 10 0 0 1 522 124 L 522 144 L 502 144 Z"`,
    repl: `        <path id="lid" d="M503 126 A 9 9 0 0 1 521 126 L 521 132 A 9 9 0 0 0 503 132 Z"` },

  { name: 'M18 挡泥板弧心偏离轮毂 6px',
    find: `        <path id="fenderRear"  d="M280.5 318.5 A 70 70 0 0 1 379.5 318.5"/>`,
    repl: `        <path id="fenderRear"  d="M272 330 A 66 66 0 0 1 388 330"/>` },
];

const knownUncaught = new Set([]);   // 目前没有已知未覆盖的变异；若新增判据覆盖不到某功能，写进这里并在 README 说明

console.log('== 基线 ==');
const b = selfTest(SRC);
console.log(`  自检 ${b.total} 条，失败 ${b.fails.length} 条`, b.fails.join(' | '));
if (b.fails.length) { console.log('  基线不干净，先修基线再谈变异测试。'); process.exit(1); }

console.log('\n== 变异体 ==');
let missed = [];
for (const m of MUTATIONS) {
  const hits = base.split(m.find).length - 1;
  if (hits !== 1) { console.log(`  ${m.name}: find 出现 ${hits} 次，变异定义失效（需与源码对齐）`); missed.push(m.name + '(未对齐)'); continue; }
  const file = path.join(TMP, 'mut_' + m.name.slice(0, 2) + '.html');
  fs.writeFileSync(file, base.replace(m.find, () => m.repl));   // 函数式 replace：替换文本含 $
  const r = selfTest(file);
  const caught = r.fails.length > 0;
  const flag = caught ? '抓到' : (knownUncaught.has(m.name) ? '已知未覆盖' : '漏检');
  console.log(`  ${m.name.padEnd(34)} → ${flag}${r.fails.length ? '  [' + r.fails.join(', ') + ']' : ''}`);
  if (!caught && !knownUncaught.has(m.name)) missed.push(m.name);
}

console.log('\n== 结论 ==');
console.log(missed.length ? '  需修断言: ' + missed.join(' ; ') : '  全部变异被抓到');
process.exit(missed.length ? 2 : 0);
