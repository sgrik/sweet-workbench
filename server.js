// 甜蜜工作台 —— 一体化 Node 服务
// 同时托管前端静态文件 + 提供 POST /api/analyze 视频做法分析接口
// 零第三方依赖，直接用 Node 运行：node --env-file=.env server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { extract } = require('./analyze/extract');
const { summarizeRecipe } = require('./analyze/llm');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const ROOM_DIR = path.join(DATA_DIR, 'rooms');
const PORT = parseInt(process.env.PORT || '3000', 10);

// 云端模式：使用内存存储（云平台文件系统不可靠，数据靠客户端 local-first 恢复）
const CLOUD_MODE = process.env.CLOUD_MODE === '1';
const memRooms = new Map();   // room -> messages[]
const memRoomData = new Map(); // room -> { data, lm }

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.manifest': 'application/manifest+json',
  '.woff2': 'font/woff2'
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  // 防目录穿越
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT, safePath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  // 禁止对外暴露敏感/源码文件
  const base = path.basename(filePath);
  if (base.startsWith('.') || base === 'server.js' || base === 'package.json' || filePath.startsWith(DATA_DIR) || filePath.includes(path.sep + 'analyze' + path.sep)) {
    res.writeHead(404); res.end('Not Found'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA 兜底：未知路径返回 index.html
      fs.readFile(path.join(ROOT, 'index.html'), (e2, html) => {
        if (e2) { res.writeHead(404); res.end('Not Found'); }
        else { res.writeHead(200, { 'Content-Type': MIME['.html'] }); res.end(html); }
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ========== 悄悄话共享房间（两人实时互通） ==========
// 房间 = 两人约定的暗号；消息按 {id, from, text, ts} 存储，文件持久化
function sanitizeRoom(room) {
  return (typeof room === 'string' && /^[a-zA-Z0-9_-]{1,32}$/.test(room)) ? room : null;
}
function roomFile(room) { return path.join(ROOM_DIR, room + '.json'); }
function loadRoom(room) {
  if (CLOUD_MODE) return memRooms.get(room) || [];
  try {
    const data = fs.readFileSync(roomFile(room), 'utf8');
    return (JSON.parse(data).messages) || [];
  } catch (e) { return []; }
}
function saveRoom(room, messages) {
  if (CLOUD_MODE) { memRooms.set(room, messages); return; }
  try {
    if (!fs.existsSync(ROOM_DIR)) fs.mkdirSync(ROOM_DIR, { recursive: true });
    fs.writeFileSync(roomFile(room), JSON.stringify({ messages }, 'utf8'));
  } catch (e) {}
}

async function handleWhisperGet(req, res, room) {
  const safe = sanitizeRoom(room);
  if (!safe) return sendJson(res, 400, { status: 'error', message: '暗号格式不正确' });
  const m = req.url.match(/[?&]since=(\d+)/);
  const since = m ? parseInt(m[1], 10) : 0;
  const messages = loadRoom(safe).filter(x => x.ts > since);
  return sendJson(res, 200, { status: 'ok', messages });
}

async function handleWhisperPost(req, res, room) {
  const safe = sanitizeRoom(room);
  if (!safe) return sendJson(res, 400, { status: 'error', message: '暗号格式不正确' });
  let body;
  try { body = JSON.parse(await readBody(req)); }
  catch (e) { return sendJson(res, 400, { status: 'error', message: '请求体解析失败' }); }
  const from = (body && body.from || '').toString();
  const text = (body && body.text || '').toString().trim();
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(from)) return sendJson(res, 400, { status: 'error', message: '设备标识无效' });
  if (!text) return sendJson(res, 400, { status: 'error', message: '内容不能为空' });
  if (text.length > 500) return sendJson(res, 400, { status: 'error', message: '内容过长（最多500字）' });
  // 优先复用客户端生成的 id/ts，避免发送方乐观渲染与轮询拉取因 id 不一致而重复
  const id = (body && typeof body.id === 'string' && /^[a-zA-Z0-9_-]{1,40}$/.test(body.id)) ? body.id : ('m' + Date.now() + Math.floor(Math.random() * 1000));
  const ts = (body && typeof body.ts === 'number' && body.ts > 0) ? body.ts : Date.now();
  const msg = { id, from, text, ts };
  const messages = loadRoom(safe);
  messages.push(msg);
  saveRoom(safe, messages);
  return sendJson(res, 200, { status: 'ok', message: msg });
}

// ========== 全量数据同步（待办/用药/美食/旅行/时间轴等全模块） ==========
function roomDataFile(room) { return path.join(ROOM_DIR, room + '_data.json'); }
function loadRoomData(room) {
  if (CLOUD_MODE) return memRoomData.get(room) || { data: {}, lm: 0 };
  try {
    const raw = fs.readFileSync(roomDataFile(room), 'utf8');
    return JSON.parse(raw); // { data, lm }
  } catch (e) { return { data: {}, lm: 0 }; }
}
function saveRoomData(room, data, lm) {
  if (CLOUD_MODE) { memRoomData.set(room, { data: data, lm: lm }); return; }
  try {
    if (!fs.existsSync(ROOM_DIR)) fs.mkdirSync(ROOM_DIR, { recursive: true });
    fs.writeFileSync(roomDataFile(room), JSON.stringify({ data: data, lm: lm }), 'utf8');
  } catch (e) {}
}

function handleDataGet(req, res, room) {
  const safe = sanitizeRoom(room);
  if (!safe) return sendJson(res, 400, { status: 'error', message: '暗号格式不正确' });
  const d = loadRoomData(safe);
  return sendJson(res, 200, { status: 'ok', data: d.data || {}, lm: d.lm || 0 });
}

async function handleDataPut(req, res, room) {
  const safe = sanitizeRoom(room);
  if (!safe) return sendJson(res, 400, { status: 'error', message: '暗号格式不正确' });
  let body;
  try { body = JSON.parse(await readBody(req)); } catch (e) { return sendJson(res, 400, { status: 'error', message: '请求体解析失败' }); }
  const newData = body && body.data;
  if (!newData || typeof newData !== 'object') return sendJson(res, 400, { status: 'error', message: 'data 字段缺失' });
  const lm = Date.now();
  saveRoomData(safe, newData, lm);
  return sendJson(res, 200, { status: 'ok', lm });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1e6) { reject(new Error('请求体过大')); req.destroy(); return; }
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function handleAnalyze(req, res) {
  let body;
  try { body = JSON.parse(await readBody(req)); }
  catch (e) { return sendJson(res, 400, { status: 'error', message: '请求体解析失败' }); }

  const url = (body && body.url || '').trim();
  if (!/^https?:\/\//i.test(url)) {
    return sendJson(res, 400, { status: 'error', message: '请提供合法的 http(s) 视频链接' });
  }

  try {
    const extracted = await extract(url);
    let summary = { ingredients: [], steps: [], tips: '' };
    let analyzed = false;
    try {
      summary = await summarizeRecipe(extracted);
      analyzed = true;
    } catch (le) {
      // 没有 Key 或 LLM 失败：仍返回提取到的元数据，前端提示手动补充
      summary = { ingredients: [], steps: [], tips: '自动总结不可用：' + le.message };
    }
    return sendJson(res, 200, {
      status: 'ok',
      analyzed,
      url,
      platform: extracted.platform,
      title: extracted.title,
      desc: extracted.desc,
      summary
    });
  } catch (e) {
    return sendJson(res, 200, {
      status: 'error',
      url,
      message: e.message || '提取失败'
    });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(); return;
  }
  if (req.url.startsWith('/api/analyze')) {
    if (req.method === 'POST') return handleAnalyze(req, res);
    return sendJson(res, 405, { status: 'error', message: '仅支持 POST' });
  }
  const roomMatch = req.url.match(/^\/api\/rooms\/([^\/?#]+)\/(whispers|data)(\?.*)?$/);
  if (roomMatch) {
    const room = decodeURIComponent(roomMatch[1]);
    const action = roomMatch[2];
    if (action === 'whispers') {
      if (req.method === 'GET') return handleWhisperGet(req, res, room);
      if (req.method === 'POST') return handleWhisperPost(req, res, room);
      return sendJson(res, 405, { status: 'error', message: '仅支持 GET/POST' });
    }
    if (action === 'data') {
      if (req.method === 'GET') return handleDataGet(req, res, room);
      if (req.method === 'PUT') return handleDataPut(req, res, room);
      return sendJson(res, 405, { status: 'error', message: '仅支持 GET/PUT' });
    }
    return sendJson(res, 405, { status: 'error', message: '未知操作' });
  }
  if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
  res.writeHead(405); res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log('甜蜜工作台已启动：http://localhost:' + PORT);
  console.log('做法分析接口：POST http://localhost:' + PORT + '/api/analyze  { "url": "视频链接" }');
  console.log('悄悄话同步接口：GET/POST http://localhost:' + PORT + '/api/rooms/<暗号>/whispers');
  console.log('全量数据同步接口：GET/PUT http://localhost:' + PORT + '/api/rooms/<暗号>/data');
  if (!process.env.LLM_API_KEY) {
    console.log('提示：未检测到 LLM_API_KEY，自动总结将降级为“仅提取元数据 + 手动补充”。');
  }
});
