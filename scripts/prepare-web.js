// 把前端资源复制到 www/（Capacitor webDir），供打包进 APK。
// 同时在 index.html 注入 IS_NATIVE_APP 标记，让 app.js 知道当前是离线 APK 模式。
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');

// 1. 清空重建 www
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

function copyTree(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyTree(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 2. 复制前端资源
const items = ['index.html', 'app.js', 'styles.css', 'manifest.json', 'images'];
for (const it of items) {
  const src = path.join(root, it);
  if (fs.existsSync(src)) copyTree(src, path.join(www, it));
}

// 3. 在 index.html 注入离线 APK 标记（</head> 前）
const idxPath = path.join(www, 'index.html');
let html = fs.readFileSync(idxPath, 'utf8');
const marker = '<script>window.IS_NATIVE_APP=true;</script>';
if (!html.includes('IS_NATIVE_APP')) {
  html = html.replace('</head>', marker + '</head>');
  fs.writeFileSync(idxPath, html, 'utf8');
}

console.log('www/ 已准备好（含 IS_NATIVE_APP 标记）');
