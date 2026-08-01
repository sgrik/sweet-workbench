// 通用工具：B站 WBI 签名、fetch 辅助、URL 解析
const crypto = require('crypto');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// B站 WBI 签名所需的乱序表
const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
];

let _wbiKeyCache = { key: null, ts: 0 };

async function getWbiKey() {
  // 简单 10 分钟缓存，减少请求
  if (_wbiKeyCache.key && Date.now() - _wbiKeyCache.ts < 10 * 60 * 1000) {
    return _wbiKeyCache.key;
  }
  const res = await fetch('https://api.bilibili.com/x/web-interface/nav', {
    headers: { 'User-Agent': UA, Referer: 'https://www.bilibili.com' }
  });
  const json = await res.json();
  const img = json.data.wbi_img.img_url.split('/').pop().split('.')[0];
  const sub = json.data.wbi_img.sub_url.split('/').pop().split('.')[0];
  const key = img + sub;
  _wbiKeyCache = { key, ts: Date.now() };
  return key;
}

function wbiSign(params, key) {
  const mixin = key
    .split('')
    .map((_, i) => key[MIXIN_KEY_ENC_TAB[i]])
    .join('')
    .slice(0, 32);
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('md5').update(sorted + mixin).digest('hex');
}

// 给参数对象加上 wts + w_rid
async function signedParams(params) {
  const p = { ...params, wts: Math.floor(Date.now() / 1000) };
  const key = await getWbiKey();
  p.w_rid = wbiSign(p, key);
  return p;
}

function toQuery(params) {
  return Object.keys(params)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'User-Agent': UA, Referer: 'https://www.bilibili.com', ...(opts.headers || {}) }
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
  return res.json();
}

async function fetchText(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'User-Agent': UA, ...(opts.headers || {}) }
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
  return res.text();
}

// 从各种 B站链接里提取 BV 号
function getBvid(url) {
  const m = url.match(/(BV[0-9A-Za-z]+)/);
  return m ? m[1] : null;
}

// 从 YouTube 链接提取视频 ID
function getYoutubeId(url) {
  const u = new URL(url);
  if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
  if (u.searchParams.get('v')) return u.searchParams.get('v');
  const m = u.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
  return m ? m[2] : null;
}

function cleanText(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

module.exports = {
  UA,
  getWbiKey,
  wbiSign,
  signedParams,
  toQuery,
  fetchJson,
  fetchText,
  getBvid,
  getYoutubeId,
  cleanText
};
