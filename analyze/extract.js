// 各平台视频文本提取（标题 / 简介 / 字幕），尽力而为
const util = require('./util');

// ---------- B站：字幕 + 简介 ----------
async function extractBilibili(url) {
  const bvid = util.getBvid(url);
  if (!bvid) throw new Error('无法解析 B站 BV 号');

  // 1) 视频信息（标题/简介）
  let title = '';
  let desc = '';
  try {
    const p = await util.signedParams({ bvid });
    const view = await util.fetchJson('https://api.bilibili.com/x/web-interface/wbi/view?' + util.toQuery(p));
    if (view && view.data) {
      title = util.cleanText(view.data.title);
      desc = util.cleanText(view.data.desc);
    }
  } catch (e) {
    // 签名失败则尝试不带签名（部分环境仍可访问）
    try {
      const view = await util.fetchJson('https://api.bilibili.com/x/web-interface/view?bvid=' + bvid);
      if (view && view.data) {
        title = util.cleanText(view.data.title);
        desc = util.cleanText(view.data.desc);
      }
    } catch (_) { /* ignore */ }
  }

  // 2) 字幕（优先 AI 字幕）
  let transcript = '';
  try {
    const p = await util.signedParams({ bvid });
    const player = await util.fetchJson('https://api.bilibili.com/x/player/wbi/v2?' + util.toQuery(p));
    const subs = (player && player.data && player.data.subtitle && player.data.subtitle.subtitles) || [];
    if (subs.length) {
      const ai = subs.find((s) => s.lan === 'ai-zh') || subs[0];
      if (ai && ai.subtitle_url) {
        const subUrl = (ai.subtitle_url.startsWith('//') ? 'https:' : '') + ai.subtitle_url;
        const subJson = await util.fetchJson(subUrl);
        if (subJson && Array.isArray(subJson.body)) {
          transcript = subJson.body.map((b) => b.content).join(' ');
        }
      }
    }
  } catch (e) { /* 字幕拿不到不致命 */ }

  return { platform: 'bilibili', title, desc, transcript: util.cleanText(transcript) };
}

// ---------- YouTube：字幕 + 描述 ----------
async function extractYouTube(url) {
  const id = util.getYoutubeId(url);
  if (!id) throw new Error('无法解析 YouTube 视频 ID');

  const html = await util.fetchText('https://www.youtube.com/watch?v=' + id, {
    headers: { 'Accept-Language': 'zh-CN,zh;q=0.9' }
  });

  // 标题
  let title = '';
  const tMatch = html.match(/<title>([^<]*)<\/title>/);
  if (tMatch) title = util.cleanText(tMatch[1].replace(/ - YouTube$/, ''));

  // 描述（og:description）
  let desc = '';
  const dMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/)
    || html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/);
  if (dMatch) desc = util.cleanText(dMatch[1]);

  // 字幕轨道：从 ytInitialPlayerResponse 中拿 captionTracks
  let transcript = '';
  try {
    const m = html.match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\});\s*(?:var|window|<\/script>)/);
    if (m) {
      const data = JSON.parse(m[1]);
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      // 优先中文，其次英文，再取第一个
      const pick = tracks.find((t) => t.languageCode === 'zh' || t.languageCode === 'zh-CN')
        || tracks.find((t) => t.languageCode && t.languageCode.startsWith('zh'))
        || tracks.find((t) => t.languageCode === 'en')
        || tracks[0];
      if (pick && pick.baseUrl) {
        const xml = await util.fetchText(pick.baseUrl);
        const texts = xml.match(/<text[^>]*>([^<]*)<\/text>/g) || [];
        transcript = texts
          .map((t) => t.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'))
          .join(' ')
          .trim();
      }
    }
  } catch (e) { /* 字幕拿不到不致命 */ }

  return { platform: 'youtube', title, desc, transcript: util.cleanText(transcript) };
}

// ---------- 抖音 / 小红书：尽力抓元数据 ----------
async function extractGeneric(url) {
  let html = '';
  try {
    html = await util.fetchText(url, { headers: { 'Accept-Language': 'zh-CN,zh;q=0.9' } });
  } catch (e) {
    throw new Error('无法访问该链接（平台可能限制了自动抓取）：' + e.message);
  }
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const descMatch = html.match(/<meta\s+(?:name|property)="(?:description|og:description)"\s+content="([^"]*)"/i);
  const title = util.cleanText(titleMatch ? titleMatch[1] : '');
  const desc = util.cleanText(descMatch ? descMatch[1] : '');
  if (!title && !desc) {
    throw new Error('未能从该页面提取到任何文本（多为 JS 渲染或反爬页面），请手动粘贴做法');
  }
  // 抖音/小红书通常拿不到字幕，仅返回元数据
  return { platform: 'generic', title, desc, transcript: '' };
}

// ---------- 调度 ----------
async function extract(url) {
  const u = String(url).trim();
  if (/bilibili\.com|b23\.tv/.test(u)) return extractBilibili(u);
  if (/youtube\.com|youtu\.be/.test(u)) return extractYouTube(u);
  // 抖音 / 小红书 / 其它
  return extractGeneric(u);
}

module.exports = { extract, extractBilibili, extractYouTube, extractGeneric };
