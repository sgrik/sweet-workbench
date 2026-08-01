// 大模型做法总结：OpenAI 兼容接口，默认豆包/火山（Volcengine Ark）
// 配置走环境变量：
//   LLM_BASE_URL 默认 https://ark.cn-beijing.volces.com/api/v3
//   LLM_API_KEY  必填（你的 Ark API Key）
//   LLM_MODEL    默认 doubao-seed-1-6-250615（请在 Ark 控制台确认模型 ID）

function cfg() {
  return {
    baseUrl: (process.env.LLM_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, ''),
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'doubao-seed-1-6-250615'
  };
}

function buildPrompt({ title, desc, transcript, platform }) {
  const hasText = (transcript && transcript.length > 10) || (desc && desc.length > 10);
  return [
    {
      role: 'system',
      content:
        '你是一个食谱助手。用户会从一条美食视频（' + (platform || '未知平台') +
        '）的标题、简介与字幕文本中提取做法。请整理成结构化 JSON，字段：' +
        'ingredients（主要食材，字符串数组）、steps（关键步骤，按顺序排列的字符串数组）、' +
        'tips（小贴士或注意事项，字符串，没有则填空）。只输出 JSON，不要解释。' +
        '若文本不足以判断做法，steps 返回空数组并在 tips 中说明“文本不足，无法提取做法”。不要编造食材或步骤。'
    },
    {
      role: 'user',
      content:
        '标题：' + (title || '（无）') + '\n' +
        '简介：' + (desc || '（无）') + '\n' +
        '字幕/文本：' + (hasText ? (transcript || desc) : '（无可用文本）')
    }
  ];
}

async function callLLM(messages) {
  const c = cfg();
  if (!c.apiKey) {
    const err = new Error('未配置 LLM_API_KEY，无法自动总结做法');
    err.code = 'NO_KEY';
    throw err;
  }
  const res = await fetch(c.baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + c.apiKey
    },
    body: JSON.stringify({
      model: c.model,
      messages,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error('LLM 接口错误 ' + res.status + ': ' + text.slice(0, 200));
    err.code = 'LLM_ERROR';
    throw err;
  }
  const json = await res.json();
  const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  if (!content) throw new Error('LLM 返回为空');
  // 解析 JSON（容错：去掉可能包裹的代码块标记）
  let parsed;
  try {
    parsed = JSON.parse(content.replace(/^```json|^```|```$/g, '').trim());
  } catch (e) {
    // 解析失败则把原文当作 tips
    parsed = { ingredients: [], steps: [], tips: content.slice(0, 300) };
  }
  return {
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
    steps: Array.isArray(parsed.steps) ? parsed.steps : [],
    tips: typeof parsed.tips === 'string' ? parsed.tips : ''
  };
}

// 输入提取结果，输出做法总结
async function summarizeRecipe(extracted) {
  return callLLM(buildPrompt(extracted));
}

module.exports = { summarizeRecipe, buildPrompt, cfg };
