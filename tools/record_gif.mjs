import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const HTML_PATH = path.resolve('pelican-bicycle.html');
const FRAMES_DIR = path.resolve('_frames');

if (!fs.existsSync(FRAMES_DIR)) {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('启动 Chrome 无头进程...');
  const port = 9222;
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--window-size=960,540',
    '--hide-scrollbars',
    'about:blank'
  ]);

  chrome.on('error', err => console.error('Chrome spawn error:', err));

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(200);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      const tabs = await res.json();
      if (tabs && tabs.length > 0 && tabs[0].webSocketDebuggerUrl) {
        wsUrl = tabs[0].webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    chrome.kill();
    throw new Error('未能连接 Chrome CDP');
  }

  console.log('连接 CDP WebSocket:', wsUrl);
  const ws = new WebSocket(wsUrl);

  let idCounter = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(new Error(JSON.stringify(data.error)));
      else resolve(data.result);
    }
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  function send(method, params = {}) {
    const id = idCounter++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  const fileUrl = 'file:///' + HTML_PATH.replace(/\\/g, '/') + '?bare=1&paused=1';
  console.log('导航到:', fileUrl);
  await send('Page.navigate', { url: fileUrl });
  await sleep(1000);

  // 确保视口固定为 960x540
  await send('Emulation.setDeviceMetricsOverride', {
    width: 960,
    height: 540,
    deviceScaleFactor: 1,
    mobile: false
  });

  // 设置场景参数
  // 传动比 2.6, 轮径 62 -> 1个曲柄周期 = 2.6 * 2 * PI * 62 = 1012.79637 px
  // 2个曲柄周期 = 2025.5927 px
  // 在 2个曲柄周期中：双腿踩踏2圈，起伏4次，翅膀拍打正好3次！
  const crankPeriod = 2.6 * 2 * Math.PI * 62;
  const totalDist = crankPeriod * 2;
  const totalFrames = 50; // 50帧，约 20fps 播放持续 2.5s，流畅且大小适中

  console.log(`准备录制 ${totalFrames} 帧，总位移: ${totalDist.toFixed(1)} px...`);

  const tStart = Date.now();
  for (let i = 0; i < totalFrames; i++) {
    const dist = (i / totalFrames) * totalDist;
    const t = (i / totalFrames) * 2.5;
    // 在页面执行渲染
    await send('Runtime.evaluate', {
      expression: `state.dist = ${dist}; state.t = ${t}; render();`
    });

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shot.data, 'base64');
    const frameFile = path.join(FRAMES_DIR, `frame_${String(i).padStart(4, '0')}.png`);
    fs.writeFileSync(frameFile, buffer);

    if ((i + 1) % 10 === 0 || i === totalFrames - 1) {
      console.log(`已捕获 ${i + 1}/${totalFrames} 帧 (${((i + 1) / totalFrames * 100).toFixed(0)}%)`);
    }
  }

  console.log(`录制完成，耗时 ${(Date.now() - tStart) / 1000}s`);

  ws.close();
  chrome.kill();
}

main().catch(err => {
  console.error('录制失败:', err);
  process.exit(1);
});
