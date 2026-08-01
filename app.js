// 甜蜜工作台 - 完整交互脚本
(function() {
  'use strict';

  // ========== 数据管理 ==========
  const STORAGE_KEY = 'sweet-workbench-data';
  const SETTINGS_KEY = 'sweet-workbench-settings';

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        // 归一化美食视频：兼容旧版字符串数组，统一为 {url,title,summary,analyzing}
        if (data && Array.isArray(data.foods)) {
          data.foods.forEach(function (f) {
            if (!Array.isArray(f.videos)) f.videos = [];
            f.videos = f.videos.map(function (v) {
              if (typeof v === 'string') return { url: v, title: '', summary: null, analyzing: false };
              return {
                url: (v && v.url) || '',
                title: (v && v.title) || '',
                summary: (v && v.summary) || null,
                analyzing: false
              };
            }).filter(function (v) { return v.url; });
          });
        }
        return data;
      }
    } catch (e) {}
    return null;
  }

  // 确保 togetherDate 存在（兼容旧版数据）
  function ensureTogetherDate() {
    if (!appData.togetherDate) appData.togetherDate = '2025-10-20';
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch(e) {}
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch(e) { return {}; }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(userSettings));
    } catch(e) {}
  }

  // 初始示例数据
  function getSeedData() {
    return {
      todos: [
        { id: 'seed-todo-1', title: '买生日蛋糕', category: '家庭', when: '今日', time: '18:00', priority: 3, done: false, overdue: true },
        { id: 'seed-todo-2', title: '给妈妈打电话', category: '家庭', when: '今日', time: '14:00', priority: 2, done: false },
        { id: 'seed-todo-3', title: '预约牙医检查', category: '健康', when: '本周', time: '09:00', priority: 2, done: false },
        { id: 'seed-todo-4', title: '整理书房', category: '家庭', when: '今日', time: '', priority: 1, done: true }
      ],
      medications: [
        { id: 'seed-med-1', name: '维生素D', when: '早饭后', dose: '1片', status: 'pending' },
        { id: 'seed-med-2', name: '钙片', when: '午饭后', dose: '2片', status: 'done' }
      ],
      eczemaRecords: [
        { id: 'seed-eczema-1', severity: 3.5, stage: '爆发期', parts: ['脸颊', '额头', '下巴'], note: '', date: '今日' }
      ],
      foods: [
        { id: 'seed-food-1', name: '番茄鸡蛋面', category: '主食', rating: 3, note: '', image: 'images/food-noodles.png' },
        { id: 'seed-food-2', name: '银耳莲子汤', category: '汤品', rating: 4, note: '', image: 'images/food-soup.png' },
        { id: 'seed-food-3', name: '清蒸鲈鱼', category: '荤菜', rating: 5, note: '', image: 'images/food-fish.png' },
        { id: 'seed-food-4', name: '酸奶水果杯', category: '甜品', rating: 3, note: '', image: 'images/food-yogurt.png' }
      ],
      travels: [
        { id: 'seed-travel-1', location: '杭州 · 西湖', title: '秋日西湖骑行', date: '2025.10.01', tags: '浪漫 · 骑行', color: '#4A7A9E' },
        { id: 'seed-travel-2', location: '厦门 · 鼓浪屿', title: '海边日落纪念日', date: '2025.05.20', tags: '甜蜜 · 看海', color: '#5A6B8E' }
      ],
      travelPlaces: [
        { id: 'seed-place-1', name: '杭州 · 西湖', date: '2025.10.01', note: '秋日西湖骑行', lat: 30.2458, lng: 120.1410 },
        { id: 'seed-place-2', name: '厦门 · 鼓浪屿', date: '2025.05.20', note: '海边日落纪念日', lat: 24.4470, lng: 118.0660 }
      ],
      whispers: [
        { id: 'w1', text: '今天辛苦啦，记得按时吃药哦~', time: '09:15', side: 'left' },
        { id: 'w2', text: '收到！钙片已经吃了，晚上想吃什么？', time: '09:20', side: 'right' },
        { id: 'w3', text: '想吃你做的番茄鸡蛋面！', time: '09:22', side: 'left' }
      ],
      timeline: [
        { id: 'seed-tl-1', date: '2025.10.20', title: '故事开始', desc: '我们在一起了', active: true },
        { id: 'seed-tl-2', date: '2025.11.11', title: '第一次旅行', desc: '杭州西湖，第一次一起出远门', active: false },
        { id: 'seed-tl-3', date: '2026.02.14', title: '第一个情人节', desc: '烛光晚餐，属于我们的浪漫', active: false },
        { id: 'seed-tl-4', date: '2026.05.20', title: '海边纪念日', desc: '鼓浪屿日落，我们的专属纪念日', active: false }
      ],
      togetherDate: '2025-10-20'
    };
  }

  let appData = loadData() || getSeedData();
  let userSettings = loadSettings();

  // 悄悄话身份：每台设备一个稳定 deviceId，用来区分"我"（右）和"对方"（左）
  if (!userSettings.whisperDeviceId) {
    userSettings.whisperDeviceId = 'dev-' + Math.random().toString(36).slice(2, 12);
    saveSettings();
  }
  const WHISPER_MY_ID = userSettings.whisperDeviceId;
  let whisperRoom = userSettings.whisperRoom || '';
  const whisperRendered = new Set(); // 已渲染消息 id，避免轮询重复
  let whisperLastTs = 0;             // 已同步到的最新时间戳
  let whisperPollTimer = null;

  // 确保数组存在
  ['todos', 'medications', 'eczemaRecords', 'foods', 'travels', 'travelPlaces', 'whispers', 'timeline'].forEach(k => {
    if (!appData[k]) appData[k] = [];
  });

  // 首次使用保存种子数据
  if (!loadData()) saveData();

  // ========== 工具函数 ==========
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function uid() { return 'r' + Date.now() + Math.floor(Math.random() * 100); }
  function nowTime() {
    const d = new Date();
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  // ========== 状态栏时钟 ==========
  function updateClock() {
    const d = new Date();
    const h = d.getHours();
    const m = d.getMinutes();
    const el = $('#statusTime');
    if (el) el.textContent = h + ':' + String(m).padStart(2, '0');
  }
  updateClock();
  setInterval(updateClock, 30000);

  // ========== 问候语 & 日期 ==========
  function updateGreeting() {
    const d = new Date();
    const h = d.getHours();
    let greet = '早安';
    if (h >= 11 && h < 14) greet = '午安';
    else if (h >= 14 && h < 18) greet = '下午好';
    else if (h >= 18) greet = '晚安';
    const g = $('#greetingText');
    if (g) g.textContent = greet + '，小宝';

    const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const weeks = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
    const dt = $('#dateText');
    if (dt) dt.textContent = months[d.getMonth()] + d.getDate() + '日 ' + weeks[d.getDay()];

    // 各页面副标题日期
    const dateStr = months[d.getMonth()] + d.getDate() + '日 今日';
    ['medSubtitle', 'eczemaSubtitle'].forEach(id => {
      const el = $('#' + id);
      if (el) el.textContent = dateStr;
    });
  }
  updateGreeting();

  // 在一起天数（可自定义起始日期）
  ensureTogetherDate();
  function getDays() {
    var start = new Date(appData.togetherDate || '2025-10-20');
    var now = new Date();
    return Math.max(1, Math.floor((now - start) / 86400000) + 1);
  }
  function fmtDateCN(dateStr) {
    var d = new Date(dateStr);
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }
  function getNextMilestone(days) {
    var milestones = [100, 200, 300, 365, 500, 600, 700, 800, 900, 1000, 1500, 2000, 3000, 5000];
    for (var i = 0; i < milestones.length; i++) {
      if (milestones[i] > days) return milestones[i];
    }
    return null;
  }
  function updateTogetherDisplay() {
    var togetherDays = getDays();
    var daysEl = $('#daysCount');
    if (daysEl) daysEl.textContent = togetherDays;
    var usDaysEl = $('#usDays');
    if (usDaysEl) usDaysEl.textContent = togetherDays;
    var profileMeta = $('.profile-meta');
    if (profileMeta) profileMeta.textContent = '在一起 ' + togetherDays + ' 天';
    var subtitleEl = $('#usHeroSubtitle');
    if (subtitleEl) subtitleEl.textContent = '我们始于 ' + fmtDateCN(appData.togetherDate);
    var pillEl = $('#usHeroPill');
    if (pillEl) {
      var ms = getNextMilestone(togetherDays);
      if (ms) {
        var startDate = new Date(appData.togetherDate);
        var msDate = new Date(startDate.getTime() + (ms - 1) * 86400000);
        pillEl.textContent = '下一个纪念日：' + ms + '天 · ' + (msDate.getMonth() + 1) + '月' + msDate.getDate() + '日';
      } else {
        pillEl.textContent = '每一天都是纪念日';
      }
    }
  }
  updateTogetherDisplay();

  // ========== 页面切换 ==========
  const screens = {
    home: $('#screen-home'),
    medication: $('#screen-medication'),
    food: $('#screen-food'),
    eczema: $('#screen-eczema'),
    todo: $('#screen-todo'),
    travel: $('#screen-travel'),
    us: $('#screen-us'),
    settings: $('#screen-settings')
  };

  const tabs = $$('.tab-item');
  const statusBar = $('.status-bar');
  const lightScreens = ['todo', 'travel', 'us', 'settings'];

  function switchScreen(name) {
    Object.values(screens).forEach(s => s && s.classList.remove('active'));
    if (screens[name]) screens[name].classList.add('active');
    tabs.forEach(t => t.classList.toggle('active', t.dataset.target === name));
    if (statusBar) statusBar.classList.toggle('light', lightScreens.includes(name));
    if (screens[name]) screens[name].scrollTop = 0;
  }

  // Tab 导航
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchScreen(tab.dataset.target));
  });

  // 通用 data-target 跳转
  $$('[data-target]').forEach(el => {
    if (el.classList.contains('tab-item')) return;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      switchScreen(el.dataset.target);
    });
  });

  // ========== 筛选标签 ==========
  $$('[data-filter-group]').forEach(group => {
    const groupName = group.dataset.filterGroup;
    const chips = $$('.filter-chip', group);
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        applyFilter(groupName, chip.dataset.filter);
      });
    });
  });

  function applyFilter(group, value) {
    if (group === 'food') filterFood(value);
    else if (group === 'todo') filterTodo(value);
    else if (group === 'travel') filterTravel(value);
    else if (group === 'us') filterUs(value);
  }

  function filterFood(cat) {
    $$('#foodGrid .food-card').forEach(card => {
      if (cat === 'all' || card.dataset.category === cat) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
    checkEmpty('food');
  }

  function filterTodo(filter) {
    $$('#todoList .todo-card').forEach(card => {
      let show = true;
      if (filter === '今日') show = card.dataset.when === '今日';
      else if (filter === '本周') show = card.dataset.when === '本周' || card.dataset.when === '今日';
      else if (filter === '已逾期') show = card.classList.contains('overdue');
      card.style.display = show ? '' : 'none';
    });
    checkEmpty('todo');
  }

  function filterTravel(tab) {
    const list = $('#travelList');
    const wish = $('#wishlistPanel');
    const photo = $('#photoWallPanel');
    const map = $('#mapPanel');
    const empty = $('#travelEmpty');
    if (tab === '回忆') {
      if (list) list.style.display = '';
      if (wish) wish.style.display = 'none';
      if (photo) photo.style.display = 'none';
      if (map) map.style.display = 'none';
      checkEmpty('travel');
    } else if (tab === '心愿') {
      if (list) list.style.display = 'none';
      if (wish) wish.style.display = '';
      if (photo) photo.style.display = 'none';
      if (map) map.style.display = 'none';
      if (empty) empty.style.display = 'none';
    } else if (tab === '照片') {
      if (list) list.style.display = 'none';
      if (wish) wish.style.display = 'none';
      if (photo) photo.style.display = '';
      if (map) map.style.display = 'none';
      if (empty) empty.style.display = 'none';
    } else if (tab === '地图') {
      if (list) list.style.display = 'none';
      if (wish) wish.style.display = 'none';
      if (photo) photo.style.display = 'none';
      if (map) map.style.display = '';
      if (empty) empty.style.display = 'none';
      updateMapEmpty();
      if (travelLeafletMap) setTimeout(function () { travelLeafletMap.invalidateSize(); }, 60);
    }
  }

  function filterUs(tab) {
    const tl = $('#timelinePanel');
    const wp = $('#whisperPanel');
    if (tab === '时间轴') {
      if (tl) tl.style.display = '';
      if (wp) wp.style.display = 'none';
    } else {
      if (tl) tl.style.display = 'none';
      if (wp) wp.style.display = '';
      // 打开悄悄话时滚动到最新消息，确保发送窗口可见
      const chat = $('#whisperChat');
      if (chat) chat.scrollTop = chat.scrollHeight;
    }
  }

  // ========== 空状态检测 ==========
  function checkEmpty(type) {
    const map = {
      food: { grid: '#foodGrid', empty: '#foodEmpty', subtitle: '#foodSubtitle', label: '道美食' },
      todo: { grid: '#todoList', empty: '#todoEmpty', subtitle: '#todoSubtitle', label: '项待办' },
      travel: { grid: '#travelList', empty: '#travelEmpty', subtitle: '#travelSubtitle', label: '段旅程' },
      medication: { grid: '#medSections', empty: '#medEmpty', subtitle: null, label: null },
      eczema: { grid: '#eczemaRecordsList', empty: '#eczemaEmpty', subtitle: null, label: null }
    };
    const cfg = map[type];
    if (!cfg) return;
    const container = $(cfg.grid);
    if (!container) return;
    const visible = $$('.food-card, .todo-card, .memory-card, .med-list-card, .record-card', container)
      .filter(el => el.style.display !== 'none' && !el.closest('[style*="display: none"]'));
    const emptyEl = $(cfg.empty);
    if (emptyEl) emptyEl.style.display = visible.length === 0 ? 'flex' : 'none';
    if (cfg.subtitle && cfg.label) {
      const sub = $(cfg.subtitle);
      if (sub) {
        if (type === 'food') sub.textContent = visible.length + cfg.label;
        else if (type === 'todo') sub.textContent = visible.length + cfg.label;
        else if (type === 'travel') sub.textContent = '共 ' + visible.length + cfg.label;
      }
    }
  }

  // ========== 底部弹窗 ==========
  const sheetOverlay = $('#sheetOverlay');
  const bottomSheet = $('#bottomSheet');
  const sheetTitle = $('#sheetTitle');
  const sheetBody = $('#sheetBody');
  const sheetCancel = $('#sheetCancel');
  const sheetConfirm = $('#sheetConfirm');
  let currentAction = null;

  function openSheet(action) {
    currentAction = action;
    const cfg = SHEET_CONFIGS[action];
    if (!cfg) return;
    sheetTitle.textContent = cfg.title;
    sheetBody.innerHTML = cfg.body;
    if (cfg.onMount) cfg.onMount(sheetBody);
    sheetOverlay.classList.add('show');
    bottomSheet.classList.add('show');
  }

  function closeSheet() {
    sheetOverlay.classList.remove('show');
    bottomSheet.classList.remove('show');
    currentAction = null;
  }

  sheetCancel.addEventListener('click', closeSheet);
  sheetOverlay.addEventListener('click', closeSheet);
  sheetConfirm.addEventListener('click', () => {
    if (!currentAction) return;
    const cfg = SHEET_CONFIGS[currentAction];
    if (!cfg) return;
    const result = cfg.onSubmit(sheetBody);
    if (result === false) return;
    closeSheet();
    showToast(cfg.successMsg || '已添加');
  });

  // ========== 确认弹窗 ==========
  const confirmOverlay = $('#confirmOverlay');
  const confirmTitle = $('#confirmTitle');
  const confirmMsg = $('#confirmMsg');
  const confirmOk = $('#confirmOk');
  const confirmCancel = $('#confirmCancel');
  let confirmCallback = null;

  function showConfirm(title, msg, callback, isDanger) {
    confirmTitle.textContent = title;
    confirmMsg.textContent = msg;
    confirmCallback = callback;
    confirmOk.classList.toggle('danger', !!isDanger);
    confirmOverlay.classList.add('show');
  }

  confirmOk.addEventListener('click', () => {
    confirmOverlay.classList.remove('show');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });
  confirmCancel.addEventListener('click', () => {
    confirmOverlay.classList.remove('show');
    confirmCallback = null;
  });
  confirmOverlay.addEventListener('click', (e) => {
    if (e.target === confirmOverlay) {
      confirmOverlay.classList.remove('show');
      confirmCallback = null;
    }
  });

  // 美食详情：点击背景关闭
  (function bindFoodDetailClose() {
    const overlay = $('#foodDetailOverlay');
    if (overlay) overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeFoodDetail();
    });
  })();

  // ========== 轻提示 ==========
  const toastEl = $('#toast');
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  // ========== 表单辅助 ==========
  function bindChips(container, selector) {
    $$(selector + ' .form-chip', container).forEach(chip => {
      chip.addEventListener('click', () => {
        $$(selector + ' .form-chip', container).forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  }

  function bindChipsMulti(container, selector) {
    $$(selector + ' .form-chip', container).forEach(chip => {
      chip.addEventListener('click', () => chip.classList.toggle('active'));
    });
  }

  function getChip(container, selector) {
    const el = $(selector + ' .form-chip.active', container);
    return el ? el.dataset.val : null;
  }

  function getChipsMulti(container, selector) {
    return $$(selector + ' .form-chip.active', container).map(el => el.dataset.val);
  }

  // ========== 长按删除 ==========
  let longPressTimer = null;
  let longPressTarget = null;

  function bindLongPressDelete(el, onDelete) {
    el.addEventListener('touchstart', (e) => {
      longPressTarget = el;
      longPressTimer = setTimeout(() => {
        if (longPressTarget === el) {
          showConfirm('删除记录', '确定要删除这条记录吗？', onDelete, true);
        }
      }, 600);
    }, { passive: true });

    el.addEventListener('touchend', () => {
      clearTimeout(longPressTimer);
      longPressTarget = null;
    });

    el.addEventListener('touchmove', () => {
      clearTimeout(longPressTimer);
      longPressTarget = null;
    });

    // 桌面端右键
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showConfirm('删除记录', '确定要删除这条记录吗？', onDelete, true);
    });
  }

  // ========== 记录渲染 ==========

  // --- 待办 ---
  function renderTodo(item, prepend) {
    const list = $('#todoList');
    if (!list) return;
    const card = document.createElement('div');
    card.className = 'todo-card new-record';
    if (item.done) card.classList.add('done');
    if (item.overdue) card.classList.add('overdue');
    card.dataset.when = item.when || '今日';
    card.dataset.id = item.id;

    const catClass = { '家庭': 'family', '健康': 'health', '工作': 'work', '生活': 'life' }[item.category] || 'family';
    const filled = '★'.repeat(item.priority);
    const empty = '☆'.repeat(3 - item.priority);

    card.innerHTML = `
      <div class="todo-check${item.done ? ' checked' : ''}">
        ${item.done
          ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#5B9BD5"/><path d="M7 12l3 3 7-7" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/></svg>'}
      </div>
      <div class="todo-info">
        <div class="todo-title">${escHtml(item.title)}</div>
        <div class="todo-meta">
          <span class="todo-category ${catClass}">${escHtml(item.category)}</span>
          <span>${escHtml(item.when)}${item.time ? ' ' + escHtml(item.time) : ''}</span>
        </div>
        <div class="todo-stars">${filled}${empty}</div>
      </div>
      ${item.overdue ? '<span class="todo-badge overdue">已逾期</span>' : ''}
    `;

    // check 切换
    const check = card.querySelector('.todo-check');
    check.addEventListener('click', (e) => {
      e.stopPropagation();
      item.done = !item.done;
      saveData();
      if (item.done) {
        card.classList.add('done');
        check.classList.add('checked');
        check.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#5B9BD5"/><path d="M7 12l3 3 7-7" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      } else {
        card.classList.remove('done');
        check.classList.remove('checked');
        check.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
      }
      updateHomeStats();
    });

    // 长按删除
    bindLongPressDelete(card, () => {
      card.remove();
      appData.todos = appData.todos.filter(t => t.id !== item.id);
      saveData();
      updateTodoCount();
      updateHomeStats();
      showToast('已删除');
    });

    if (prepend) list.insertBefore(card, list.firstChild);
    else list.appendChild(card);
  }

  function updateTodoCount() {
    const list = $('#todoList');
    const sub = $('#todoSubtitle');
    if (list && sub) {
      const count = $$('.todo-card', list).length;
      sub.textContent = count + '项待办';
    }
    checkEmpty('todo');
  }

  // --- 用药 ---
  function renderMedication(item) {
    const container = $('#medSections');
    if (!container) return;
    const isDone = item.status === 'done';
    const sectionSelector = isDone ? '.section-indicator.green' : '.section-indicator.red';
    const indicator = $(sectionSelector, container);
    if (!indicator) return;
    const sectionHeader = indicator.parentElement;

    const card = document.createElement('div');
    card.className = 'med-list-card card new-record';
    card.dataset.id = item.id;
    card.innerHTML = `
      <div class="med-icon med-vitamin"></div>
      <div class="med-info">
        <div class="med-name">${escHtml(item.name)}</div>
        <div class="med-desc">${escHtml(item.when)} · ${escHtml(item.dose)}</div>
      </div>
      <button class="med-status ${isDone ? 'done' : 'pending'}" type="button">${isDone ? '已服' : '未服'}</button>
    `;

    const btn = card.querySelector('.med-status');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      item.status = item.status === 'done' ? 'pending' : 'done';
      saveData();
      // 重新渲染所有用药
      rerenderMedications();
      updateHomeStats();
    });

    bindLongPressDelete(card, () => {
      appData.medications = appData.medications.filter(m => m.id !== item.id);
      saveData();
      rerenderMedications();
      updateHomeStats();
      showToast('已删除');
    });

    sectionHeader.insertAdjacentElement('afterend', card);
  }

  function rerenderMedications() {
    const container = $('#medSections');
    if (!container) return;
    // 移除非 section-header 的卡片
    $$('.med-list-card', container).forEach(c => c.remove());

    const pending = appData.medications.filter(m => m.status === 'pending');
    const done = appData.medications.filter(m => m.status === 'done');

    const redIndicator = $('.section-indicator.red', container);
    const greenIndicator = $('.section-indicator.green', container);

    if (redIndicator) {
      const header = redIndicator.parentElement;
      const countEl = $('#medPendingCount');
      if (countEl) countEl.textContent = pending.length;
      pending.forEach(item => {
        const card = createMedCard(item);
        header.insertAdjacentElement('afterend', card);
      });
    }

    if (greenIndicator) {
      const header = greenIndicator.parentElement;
      const countEl = $('#medDoneCount');
      if (countEl) countEl.textContent = done.length;
      done.forEach(item => {
        const card = createMedCard(item);
        header.insertAdjacentElement('afterend', card);
      });
    }

    checkEmpty('medication');
  }

  function createMedCard(item) {
    const isDone = item.status === 'done';
    const card = document.createElement('div');
    card.className = 'med-list-card card';
    card.dataset.id = item.id;
    card.innerHTML = `
      <div class="med-icon med-vitamin"></div>
      <div class="med-info">
        <div class="med-name">${escHtml(item.name)}</div>
        <div class="med-desc">${escHtml(item.when)} · ${escHtml(item.dose)}</div>
      </div>
      <button class="med-status ${isDone ? 'done' : 'pending'}" type="button">${isDone ? '已服' : '未服'}</button>
    `;
    const btn = card.querySelector('.med-status');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      item.status = item.status === 'done' ? 'pending' : 'done';
      saveData();
      rerenderMedications();
      updateHomeStats();
    });
    bindLongPressDelete(card, () => {
      appData.medications = appData.medications.filter(m => m.id !== item.id);
      saveData();
      rerenderMedications();
      updateHomeStats();
      showToast('已删除');
    });
    return card;
  }

  // --- 湿疹记录 ---
  function renderEczema(item) {
    const container = $('#eczemaRecordsList');
    if (!container) return;
    const card = document.createElement('div');
    card.className = 'record-card card new-record';
    card.dataset.id = item.id;
    const partsHtml = (item.parts && item.parts.length)
      ? item.parts.map(p => '<span>' + escHtml(p) + '</span>').join('')
      : '<span>未记录</span>';

    card.innerHTML = `
      <div class="card-header">
        <span class="card-title">湿疹记录</span>
        <span class="card-subtitle">${escHtml(item.date)}</span>
      </div>
      <div class="record-row">
        <span class="record-label">严重程度</span>
        <span class="record-value coral">${item.severity}/5</span>
      </div>
      <div class="record-row">
        <span class="record-label">当前阶段</span>
        <span class="stage-pill active">${escHtml(item.stage)}</span>
      </div>
      <div class="record-section">
        <div class="record-label">部位</div>
        <div class="body-parts">${partsHtml}</div>
      </div>
      ${item.note ? '<div class="record-row"><span class="record-label">备注</span><span style="font-size:13px;color:var(--text-secondary);text-align:right;flex:1">' + escHtml(item.note) + '</span></div>' : ''}
    `;

    bindLongPressDelete(card, () => {
      appData.eczemaRecords = appData.eczemaRecords.filter(e => e.id !== item.id);
      saveData();
      card.remove();
      checkEmpty('eczema');
      showToast('已删除');
    });

    container.insertBefore(card, container.firstChild);
  }

  // --- 美食 ---
  function renderFood(item, prepend) {
    const grid = $('#foodGrid');
    if (!grid) return;
    const card = document.createElement('div');
    card.className = 'food-card new-record';
    card.dataset.category = item.category;
    card.dataset.id = item.id;

    const tagClass = { '主食': 'staple', '蔬菜': 'veggie', '荤菜': 'meat', '汤品': 'soup', '甜品': 'dessert', '饮品': 'drink' }[item.category] || 'staple';
    const gradients = ['#C4DAEC', '#D5E4F0', '#B8D4DC', '#C8D8E8', '#B0CCE0'];
    const gradient = gradients[grid.children.length % gradients.length];
    const stars = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);

    const imgHtml = item.image
      ? '<img src="' + escHtml(item.image) + '" alt="' + escHtml(item.name) + '" class="food-img">'
      : '';
    const bgStyle = item.image ? '' : 'background:' + gradient + ';';

    const vids = item.videos || [];
    const vidDone = vids.filter(function (v) {
      const s = v.summary; return s && ((s.steps && s.steps.length) || (s.ingredients && s.ingredients.length));
    }).length;
    const badge = vids.length
      ? '<div class="food-video-badge"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' + vids.length +
        (vidDone ? '<span class="food-video-done">已总结</span>' : '') + '</div>'
      : '';

    card.innerHTML = `
      <div class="food-image" style="${bgStyle}">
        ${imgHtml}
        ${badge}
        <button class="food-delete" type="button" aria-label="删除">×</button>
      </div>
      <div class="food-name">${escHtml(item.name)}</div>
      <div class="food-meta-row">
        <span class="food-tag ${tagClass}">${escHtml(item.category)}</span>
        <span class="food-stars">${stars}</span>
      </div>
      ${item.note ? '<div style="font-size:11px;color:var(--text-tertiary);margin-top:6px;line-height:1.4;">' + escHtml(item.note) + '</div>' : ''}
    `;

    // 可见删除按钮
    const delBtn = card.querySelector('.food-delete');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFood(item, card);
      });
    }

    // 长按 / 右键删除
    bindLongPressDelete(card, () => deleteFood(item));

    // 点击卡片打开详情
    card.addEventListener('click', () => openFoodDetail(item));

    if (prepend) grid.insertBefore(card, grid.firstChild);
    else grid.appendChild(card);
  }

  function deleteFood(item) {
    showConfirm('删除美食', '确定要删除「' + item.name + '」吗？', () => {
      const card = $('.food-card[data-id="' + item.id + '"]');
      appData.foods = appData.foods.filter(f => f.id !== item.id);
      saveData();
      if (card) card.remove();
      updateFoodCount();
      showToast('已删除');
    }, true);
  }

  // 美食详情弹窗：展示封面、信息、备注，以及「可播放视频 + 做法总结」图文结合
  let currentDetailId = null;

  // 单个视频的做法总结区块（分析中 / AI 总结 / 手动补充）
  function videoSummaryHtml(v) {
    if (v.analyzing) {
      return '<div class="food-analyzing"><span class="dot-spin"></span>正在分析视频做法…</div>';
    }
    const s = v.summary;
    const hasStruct = s && ((s.ingredients && s.ingredients.length) || (s.steps && s.steps.length));
    let html = '';
    if (hasStruct) {
      if (s.ingredients && s.ingredients.length) {
        html += '<div class="food-summary-block"><div class="food-summary-label">食材</div><div class="food-summary-tags">' +
          s.ingredients.map(function (i) { return '<span class="food-summary-tag">' + escHtml(i) + '</span>'; }).join('') + '</div></div>';
      }
      if (s.steps && s.steps.length) {
        html += '<div class="food-summary-block"><div class="food-summary-label">步骤</div><ol class="food-summary-steps">' +
          s.steps.map(function (st) { return '<li>' + escHtml(st) + '</li>'; }).join('') + '</ol></div>';
      }
    }
    const tipsVal = (s && s.tips) ? s.tips : '';
    const isErr = typeof tipsVal === 'string' && /^自动(总结|提取)/.test(tipsVal);
    if (isErr) {
      html = '<div class="food-summary-note">' + escHtml(tipsVal) + '</div>' + html;
    }
    html += '<div class="food-summary-edit-wrap">' +
      '<label class="food-summary-edit-label">' + (isErr ? '自动提取不可用，可手动粘贴做法：' : '做法笔记（可补充 / 修改）') + '</label>' +
      '<textarea class="food-summary-edit" data-url="' + escHtml(v.url) + '" placeholder="把做法步骤贴在这里，保存后即与视频一起展示…" maxlength="1000">' + escHtml(isErr ? '' : tipsVal) + '</textarea>' +
      '</div>';
    return html;
  }

  function buildDetailVideos(full) {
    if (!full.videos || !full.videos.length) return '';
    return '<div class="food-detail-section"><div class="food-detail-section-title">做法视频（' + full.videos.length + '）</div>' +
      full.videos.map(function (v) {
        let host = v.url; try { host = new URL(v.url).hostname; } catch (e) {}
        return '<a class="video-link-card" href="' + escHtml(v.url) + '" target="_blank" rel="noopener">' +
          '<span class="video-link-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>' +
          '<span class="video-link-info"><span class="video-link-title">' + escHtml(v.title || '做法视频') + '</span><span class="video-link-host">' + escHtml(host) + '</span></span>' +
          '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>' +
          '</a>' + videoSummaryHtml(v);
      }).join('') + '</div>';
  }

  function renderFoodDetailContent(full) {
    const sheet = $('#foodDetailSheet');
    if (!sheet) return;
    const tagClass = { '主食': 'staple', '蔬菜': 'veggie', '荤菜': 'meat', '汤品': 'soup', '甜品': 'dessert', '饮品': 'drink' }[full.category] || 'staple';
    const stars = '★'.repeat(full.rating) + '☆'.repeat(5 - full.rating);
    const media = full.image
      ? '<img src="' + escHtml(full.image) + '" alt="' + escHtml(full.name) + '" class="food-detail-img">'
      : '<div class="food-detail-img food-detail-img-empty">' + escHtml(full.name) + '</div>';
    const videosHtml = buildDetailVideos(full);

    sheet.innerHTML = `
      <button class="food-detail-close" id="foodDetailClose" type="button" aria-label="关闭">×</button>
      <div class="food-detail-media">${media}</div>
      <div class="food-detail-body">
        <div class="food-detail-head">
          <div class="food-detail-name">${escHtml(full.name)}</div>
          <span class="food-tag ${tagClass}">${escHtml(full.category)}</span>
        </div>
        <div class="food-detail-stars">${stars}</div>
        ${full.note ? '<div class="food-detail-note">' + escHtml(full.note).replace(/\n/g, '<br>') + '</div>' : ''}
        ${videosHtml}
        <button class="food-detail-delete" id="foodDetailDelete" type="button">删除这道美食</button>
      </div>
    `;
    const closeBtn = $('#foodDetailClose');
    const delBtn = $('#foodDetailDelete');
    if (closeBtn) closeBtn.addEventListener('click', closeFoodDetail);
    if (delBtn) delBtn.addEventListener('click', () => { deleteFood(full); closeFoodDetail(); });
    // 手动补充做法：失焦即保存
    const tas = sheet.querySelectorAll('.food-summary-edit');
    tas.forEach(function (area) {
      area.addEventListener('blur', function () {
        const url = area.dataset.url;
        const v = (full.videos || []).find(function (x) { return x.url === url; });
        if (!v) return;
        v.summary = v.summary || { ingredients: [], steps: [] };
        v.summary.tips = area.value.trim();
        saveData();
      });
    });
  }

  function openFoodDetail(item) {
    const overlay = $('#foodDetailOverlay');
    const sheet = $('#foodDetailSheet');
    if (!overlay || !sheet) return;
    const full = appData.foods.find(f => f.id === item.id) || item;
    currentDetailId = full.id;
    renderFoodDetailContent(full);
    overlay.classList.add('show');
    analyzeFoodVideos(full);
  }

  function refreshFoodDetail() {
    if (!currentDetailId) return;
    const full = appData.foods.find(f => f.id === currentDetailId);
    if (full) renderFoodDetailContent(full);
  }

  function closeFoodDetail() {
    const overlay = $('#foodDetailOverlay');
    if (overlay) overlay.classList.remove('show');
    currentDetailId = null;
  }

  // 自动分析视频做法：调用后端 /api/analyze，结果写回并刷新详情
  function analyzeFoodVideos(item) {
    if (!item.videos || !item.videos.length) return;
    let pending = false;
    item.videos.forEach(function (v) {
      if (v.url && !v.summary && !v.analyzing) { v.analyzing = true; pending = true; }
    });
    if (!pending) return;
    refreshFoodDetail();
    saveData();
    item.videos.forEach(function (v) {
      if (!v.url || v.summary || !v.analyzing) return;
      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: v.url })
      })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          v.analyzing = false;
          if (j && j.status === 'ok') {
            if (j.title) v.title = j.title;
            if (j.analyzed && j.summary) v.summary = j.summary;
            else v.summary = { ingredients: [], steps: [], tips: (j.summary && j.summary.tips) ? j.summary.tips : '' };
          } else {
            v.summary = { ingredients: [], steps: [], tips: (j && j.message) ? '自动提取失败：' + j.message : '自动提取失败' };
          }
        })
        .catch(function () {
          // 后端不可用（如纯静态部署）或网络异常：降级为手动补充
          v.analyzing = false;
          v.summary = { ingredients: [], steps: [], tips: '' };
        })
        .finally(function () { saveData(); refreshFoodDetail(); });
    });
  }

  // 把选择的图片文件压缩为 dataURL（限制尺寸，避免撑爆 localStorage）
  function fileToDataURL(file, maxW, maxH, cb) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        cb(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = function () { cb(null); };
      img.src = e.target.result;
    };
    reader.onerror = function () { cb(null); };
    reader.readAsDataURL(file);
  }

  function updateFoodCount() {
    const grid = $('#foodGrid');
    const sub = $('#foodSubtitle');
    if (grid && sub) {
      const count = $$('.food-card', grid).length;
      sub.textContent = count + '道美食';
    }
    checkEmpty('food');
  }

  // --- 旅行 ---
  function renderTravel(item) {
    const list = $('#travelList');
    if (!list) return;
    const card = document.createElement('div');
    card.className = 'memory-card new-record' + (item.cover ? ' has-cover' : '');
    card.dataset.id = item.id;
    if (item.cover) {
      card.style.backgroundImage = "url('" + item.cover + "')";
      card.style.backgroundSize = 'cover';
      card.style.backgroundPosition = 'center';
    } else {
      card.style.background = item.color;
    }
    card.innerHTML = `
      ${item.cover ? '<div class="memory-overlay"></div>' : ''}
      <div class="memory-content">
        <div class="memory-location">${escHtml(item.location)}</div>
        <div class="memory-title">${escHtml(item.title)}</div>
        <div class="memory-date">${escHtml(item.date)}${item.tags ? ' · ' + escHtml(item.tags) : ''}</div>
      </div>
    `;

    bindLongPressDelete(card, () => {
      appData.travels = appData.travels.filter(t => t.id !== item.id);
      saveData();
      card.remove();
      updateTravelCount();
      showToast('已删除');
    });

    const wishlist = list.querySelector('.wishlist-card');
    if (wishlist) list.insertBefore(card, wishlist);
    else list.appendChild(card);
  }

  function updateTravelCount() {
    const list = $('#travelList');
    const sub = $('#travelSubtitle');
    if (list && sub) {
      const count = $$('.memory-card', list).length;
      sub.textContent = '共 ' + count + ' 段旅程';
    }
    checkEmpty('travel');
  }

  // --- 旅行足迹地图（真实地图 Leaflet） ---
  let travelLeafletMap = null;
  const placeMarkers = {};
  let pendingMapPoint = null;
  let pendingTravelCover = null;
  let routeLine = null;

  // WGS-84 → GCJ-02（高德火星坐标）转换，确保标记与高德底图精准对齐
  function wgs84ToGcj02(lat, lng) {
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    const outOfChina = function (lo, la) {
      return !(lo > 73.66 && lo < 135.05 && la > 3.86 && la < 53.55);
    };
    const transformLat = function (x, y) {
      let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
      ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
      ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
      ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
      return ret;
    };
    const transformLng = function (x, y) {
      let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
      ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
      ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
      ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
      return ret;
    };
    if (outOfChina(lng, lat)) return [lat, lng];
    let dLat = transformLat(lng - 105.0, lat - 35.0);
    let dLng = transformLng(lng - 105.0, lat - 35.0);
    const radLat = lat / 180.0 * Math.PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
    dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
    return [lat + dLat, lng + dLng];
  }

  // 足迹图钉：白色心形 + 放大阴影（备选：圆形灰底加号见 makeCircleIcon）
  function makeMarkerIcon(item) {
    return L.divIcon({
      className: 'map-marker footprint-heart',
      html:
        '<div class="footprint-pin-wrap">' +
          '<svg class="footprint-heart-svg" viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">' +
            '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ffffff" stroke="#ff6b81" stroke-width="1.6"/>' +
          '</svg>' +
          '<span class="footprint-shadow"></span>' +
          (item.name ? '<div class="footprint-label">' + escHtml(item.name) + '</div>' : '') +
        '</div>',
      iconSize: [30, 36],
      iconAnchor: [15, 27]
    });
  }

  // 备选图钉：圆形微缩照片占位（灰底 + 加号）
  function makeCircleIcon() {
    return L.divIcon({
      className: 'map-marker footprint-circle',
      html: '<div class="footprint-circle"><span class="footprint-plus">+</span></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  }

  function renderPlace(item) {
    if (!travelLeafletMap) return;
    const g = wgs84ToGcj02(item.lat, item.lng);
    const marker = L.marker([g[0], g[1]], { icon: makeMarkerIcon(item) }).addTo(travelLeafletMap);
    const popupHtml =
      '<div class="map-pop">' +
        '<div class="map-pop-name">' + escHtml(item.name) + '</div>' +
        (item.date ? '<div class="map-pop-date">' + escHtml(item.date) + '</div>' : '') +
        (item.note ? '<div class="map-pop-note">' + escHtml(item.note) + '</div>' : '') +
        '<button class="map-pop-del" type="button" data-id="' + escHtml(item.id) + '">删除足迹</button>' +
      '</div>';
    marker.bindPopup(popupHtml);
    placeMarkers[item.id] = marker;
    updateMapEmpty();
  }

  function removePlaceMarker(id) {
    if (placeMarkers[id]) {
      travelLeafletMap.removeLayer(placeMarkers[id]);
      delete placeMarkers[id];
    }
    renderRoute();
  }

  // 按日期排序，在已有足迹之间连出时间顺序“路线图”
  function renderRoute() {
    if (!travelLeafletMap) return;
    if (routeLine) {
      travelLeafletMap.removeLayer(routeLine);
      routeLine = null;
    }
    const pts = appData.travelPlaces
      .slice()
      .sort(function (a, b) {
        return String(a.date || '').replace(/\./g, '') - String(b.date || '').replace(/\./g, '');
      })
      .map(function (p) {
        const g = wgs84ToGcj02(p.lat, p.lng);
        return [g[0], g[1]];
      });
    if (pts.length > 1) {
      routeLine = L.polyline(pts, {
        color: '#ff6b81',
        weight: 2,
        opacity: 0.85,
        dashArray: '6 6',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(travelLeafletMap);
    }
  }

  function updateMapEmpty() {
    const hint = $('#mapHint');
    if (!hint) return;
    const count = Object.keys(placeMarkers).length;
    hint.style.display = count === 0 ? 'flex' : 'none';
  }

  // ========== 城市名搜索自动定位 ==========
  // 内置中国主要城市坐标库（WGS-84，离线、免 Key，秒定位）
  const CITY_COORDS = {
    '北京': [39.9042, 116.4074], '上海': [31.2304, 121.4737], '广州': [23.1291, 113.2644],
    '深圳': [22.5431, 114.0579], '天津': [39.3434, 117.3616], '重庆': [29.5630, 106.5516],
    '杭州': [30.2741, 120.1551], '成都': [30.5728, 104.0668], '南京': [32.0603, 118.7969],
    '武汉': [30.5928, 114.3055], '西安': [34.3416, 108.9398], '苏州': [31.2989, 120.5853],
    '厦门': [24.4798, 118.0894], '青岛': [36.0671, 120.3826], '长沙': [28.2282, 112.9388],
    '昆明': [24.8801, 102.8329], '大连': [38.9140, 121.6147], '宁波': [29.8683, 121.5440],
    '无锡': [31.4912, 120.3119], '福州': [26.0745, 119.2965], '济南': [36.6512, 117.1201],
    '合肥': [31.8206, 117.2272], '南昌': [28.6829, 115.8582], '郑州': [34.7466, 113.6254],
    '太原': [37.8706, 112.5489], '沈阳': [41.8057, 123.4315], '长春': [43.8171, 125.3235],
    '哈尔滨': [45.8038, 126.5350], '石家庄': [38.0428, 114.5149], '南宁': [22.8170, 108.3665],
    '贵阳': [26.6470, 106.6302], '海口': [20.0440, 110.1999], '三亚': [18.2528, 109.5119],
    '兰州': [36.0611, 103.8343], '西宁': [36.6171, 101.7782], '银川': [38.4872, 106.2309],
    '呼和浩特': [40.8426, 111.7492], '乌鲁木齐': [43.8256, 87.6168], '拉萨': [29.6520, 91.1721],
    '桂林': [25.2736, 110.2990], '丽江': [26.8721, 100.2299], '大理': [25.6065, 100.2676],
    '泉州': [24.8741, 118.6757], '温州': [27.9938, 120.6994], '烟台': [37.4638, 121.4479],
    '珠海': [22.2710, 113.5767], '东莞': [23.0210, 113.7519], '佛山': [23.0218, 113.1219],
    '扬州': [32.3942, 119.4129], '绍兴': [30.0018, 120.5819], '嘉兴': [30.7464, 120.7553],
    '镇江': [32.2000, 119.4400], '南通': [31.9789, 120.8941], '徐州': [34.2618, 117.1850],
    '常州': [31.8106, 119.9736], '洛阳': [34.6180, 112.4540], '黄山': [29.7152, 118.3400],
    '张家界': [29.1170, 110.4792], '九寨沟': [33.2600, 103.9180], '敦煌': [40.1421, 94.6618],
    '香港': [22.3193, 114.1694], '澳门': [22.1987, 113.5439], '台北': [25.0330, 121.5654],
    '景德镇': [29.2921, 117.1796], '汕头': [23.3540, 116.6820], '北海': [21.4810, 109.1200],
    '喀什': [39.4677, 75.9890], '吐鲁番': [42.9516, 89.1817], '包头': [40.6570, 109.8400],
    '鄂尔多斯': [39.6080, 109.7810], '拉萨': [29.6520, 91.1721]
  };

  // 在字典中模糊匹配城市（去除市/省/区等后缀）
  function findCityInDict(q) {
    if (CITY_COORDS[q]) return { name: q, lat: CITY_COORDS[q][0], lng: CITY_COORDS[q][1] };
    const cleaned = q.replace(/[省市区县镇]$/, '');
    for (const key in CITY_COORDS) {
      if (key.indexOf(cleaned) !== -1 || cleaned.indexOf(key) !== -1) {
        return { name: key, lat: CITY_COORDS[key][0], lng: CITY_COORDS[key][1] };
      }
    }
    return null;
  }

  // 命中结果：飞行到该城市 + 预填名称并弹出标记弹窗
  function applyCityResult(lat, lng, name) {
    if (!travelLeafletMap) { showToast('地图尚未加载，请稍候'); return; }
    const g = wgs84ToGcj02(lat, lng);
    travelLeafletMap.setView([g[0], g[1]], 11);
    pendingMapPoint = { lat: lat, lng: lng };   // 存 WGS-84，显示时再转 GCJ-02
    openSheet('add-place');
    const input = $('#f-place-name');
    if (input && name) input.value = name;
  }

  // Nominatim 兜底（免 Key，支持任意地名，返回 WGS-84）
  function geocodeNominatim(q) {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=zh-CN&countrycodes=cn&q=' + encodeURIComponent(q);
    fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.length && data[0].lat && data[0].lon) {
          applyCityResult(parseFloat(data[0].lat), parseFloat(data[0].lon), q);
        } else {
          showToast('未找到「' + q + '」，可点击地图手动标记');
        }
      })
      .catch(function () {
        showToast('搜索服务不可用，请点击地图手动标记');
      });
  }

  // 入口：先查内置库，未命中再走 Nominatim
  function searchCity(query) {
    const q = (query || '').trim();
    if (!q) { showToast('请输入城市名'); return; }
    const hit = findCityInDict(q);
    if (hit) { applyCityResult(hit.lat, hit.lng, hit.name); return; }
    showToast('正在搜索…');
    geocodeNominatim(q);
  }

  // 绑定搜索框
  (function bindCitySearch() {
    const citySearch = $('#citySearch');
    const citySearchBtn = $('#citySearchBtn');
    if (citySearchBtn) citySearchBtn.addEventListener('click', function () { searchCity(citySearch.value); });
    if (citySearch) {
      citySearch.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') searchCity(citySearch.value);
      });
    }
  })();

  function initMap() {
    if (travelLeafletMap) return;
    const el = $('#travelMap');
    if (!el || typeof L === 'undefined') return;
    // 中国疆域限制：锁定 maxBounds + minZoom，禁止拖出中国、缩到世界地图
    travelLeafletMap = L.map(el, {
      zoomControl: true,
      attributionControl: true,
      minZoom: 4,
      maxZoom: 12,
      maxBounds: [[3, 73], [54, 135]],
      maxBoundsViscosity: 1.0,   // 1.0 = 硬边界
      worldCopyJump: false       // 不显示重复世界副本
    }).setView([34, 108], 4);
    L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      maxZoom: 12,
      subdomains: '1234',
      attribution: '© 高德地图'
    }).addTo(travelLeafletMap);

    // 底图加载失败（跨域 / 版权）→ 顶部横幅提示
    travelLeafletMap.on('tileerror', function () {
      const banner = $('#mapErrorBanner');
      if (banner) banner.style.display = 'flex';
    });

    travelLeafletMap.on('click', function (e) {
      pendingMapPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
      openSheet('add-place');
    });

    travelLeafletMap.on('popupopen', function (e) {
      const container = e.popup.getElement();
      const btn = container && container.querySelector('.map-pop-del');
      if (btn) {
        btn.addEventListener('click', function () {
          const id = btn.dataset.id;
          const item = appData.travelPlaces.find(function (p) { return p.id === id; });
          showConfirm('删除「' + (item ? item.name : '该足迹') + '」这个足迹？', function () {
            appData.travelPlaces = appData.travelPlaces.filter(function (p) { return p.id !== id; });
            saveData();
            removePlaceMarker(id);
            travelLeafletMap.closePopup();
            updateMapEmpty();
            showToast('已删除');
          });
        });
      }
    });

    appData.travelPlaces.forEach(function (item) { renderPlace(item); });
    renderRoute();
    updateMapEmpty();
  }

  // --- 悄悄话 ---
  // 真实两人对话：消息带 from（设备id），自己发的在右侧，对方在左侧；无 from 为旧版本地演示
  function formatWhisperTime(ts) {
    const d = new Date(ts);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return sameDay ? hm : (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hm;
  }

  function renderWhisper(msg) {
    const chat = $('#whisperChat');
    if (!chat || !msg) return;
    if (msg.id && whisperRendered.has(msg.id)) return; // 去重，防轮询重复渲染
    const side = msg.from ? (msg.from === WHISPER_MY_ID ? 'right' : 'left') : (msg.side || 'right');
    const time = msg.ts ? formatWhisperTime(msg.ts) : (msg.time || '');
    const isMine = !msg.from || msg.from === WHISPER_MY_ID;
    const el = document.createElement('div');
    el.className = 'whisper-msg ' + side + ' new-record';
    el.dataset.id = msg.id || '';
    el.innerHTML = `
      <div class="whisper-bubble">${escHtml(msg.text)}</div>
      <div class="whisper-time">${escHtml(time)}${!isMine ? ' · 对方' : ''}</div>
    `;
    chat.appendChild(el);
    if (msg.id) whisperRendered.add(msg.id);
    // 滚动到底部
    const panel = $('#whisperPanel');
    if (panel) panel.scrollTop = panel.scrollHeight;
  }

  // 时间轴事件渲染（数据驱动）
  function renderTimelineEvent(item, prepend) {
    const list = $('#timelineList');
    if (!list) return;
    const ev = document.createElement('div');
    ev.className = 'timeline-event new-record';
    ev.dataset.id = item.id;
    ev.innerHTML = `
      <div class="timeline-dot ${item.active ? 'active' : ''}"></div>
      <div class="timeline-content">
        <div class="timeline-date">${escHtml(item.date)}</div>
        <div class="timeline-title">${escHtml(item.title)}</div>
        ${item.desc ? '<div class="timeline-desc">' + escHtml(item.desc) + '</div>' : ''}
      </div>
    `;
    bindLongPressDelete(ev, () => deleteTimelineEvent(item, ev));
    if (prepend) list.insertBefore(ev, list.firstChild);
    else list.appendChild(ev);
  }

  function deleteTimelineEvent(item, ev) {
    showConfirm('删除记录', '确定删除「' + item.title + '」吗？', () => {
      appData.timeline = appData.timeline.filter(t => t.id !== item.id);
      saveData();
      ev.remove();
      showToast('已删除');
    }, true);
  }

  // 悄悄话发送（真实两人互通：先本地渲染，再同步到共享房间）
  const whisperSend = $('#whisperSend');
  const whisperInput = $('#whisperInput');
  async function sendWhisper() {
    const text = whisperInput.value.trim();
    if (!text) return;
    const msg = { id: uid(), from: WHISPER_MY_ID, text, ts: Date.now() };
    appData.whispers.push(msg);
    saveData();
    renderWhisper(msg);
    whisperInput.value = '';
    if (!whisperRoom) return; // 未连接暗号：仅本地保存
    try {
      const res = await fetch('/api/rooms/' + encodeURIComponent(whisperRoom) + '/whispers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 把本地生成的 id/ts 一起发过去，服务端沿用，避免轮询时重复渲染
        body: JSON.stringify({ id: msg.id, from: WHISPER_MY_ID, text, ts: msg.ts })
      });
      if (!res.ok) throw new Error('网络错误');
      setWhisperSyncStatus('online');
    } catch (e) {
      setWhisperSyncStatus('offline');
      showToast('已存到本地，对方暂时收不到（需后端在线）');
    }
  }
  if (whisperSend) whisperSend.addEventListener('click', sendWhisper);
  if (whisperInput) whisperInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendWhisper();
  });

  // 从共享房间拉取对方的消息（轮询）
  async function pollWhispers() {
    if (!whisperRoom) return;
    try {
      const res = await fetch('/api/rooms/' + encodeURIComponent(whisperRoom) + '/whispers?since=' + whisperLastTs);
      const data = await res.json();
      if (data && data.status === 'ok' && Array.isArray(data.messages)) {
        data.messages.forEach(function (m) {
          if (!whisperRendered.has(m.id)) {
            appData.whispers.push(m);
            renderWhisper(m);
            if (m.ts > whisperLastTs) whisperLastTs = m.ts;
          }
        });
        saveData();
        setWhisperSyncStatus('online');
      }
    } catch (e) {
      setWhisperSyncStatus('offline');
    }
  }
  function startWhisperSync() {
    stopWhisperSync();
    pollWhispers();
    whisperPollTimer = setInterval(pollWhispers, 2500);
  }
  function stopWhisperSync() {
    if (whisperPollTimer) { clearInterval(whisperPollTimer); whisperPollTimer = null; }
  }
  function setWhisperSyncStatus(state) {
    const dot = $('#wpDot');
    if (dot) dot.className = 'wp-dot ' + (state === 'online' ? 'online' : 'offline');
  }

  // 暗号连接 / 配对条
  function renderWhisperPairBar() {
    const setup = $('#wpSetup'), conn = $('#wpConnected');
    if (!setup || !conn) return;
    if (whisperRoom) {
      setup.style.display = 'none';
      conn.style.display = 'flex';
      $('#wpCode').textContent = whisperRoom;
    } else {
      setup.style.display = 'block';
      conn.style.display = 'none';
    }
  }
  function bindWhisperPair() {
    const confirm = $('#wpConfirm'), input = $('#wpInput');
    const copy = $('#wpCopy'), change = $('#wpChange');
    if (confirm) confirm.addEventListener('click', function () {
      const code = (input && input.value || '').trim();
      if (!/^[a-zA-Z0-9_-]{1,32}$/.test(code)) {
        showToast('暗号仅限字母/数字/下划线，最长32位');
        return;
      }
      // 首次连接：清空本地假演示，让共享空间从零开始
      if (!userSettings.whisperPairedOnce) {
        appData.whispers = [];
        whisperRendered.clear();
        const chat = $('#whisperChat');
        if (chat) chat.innerHTML = '';
        whisperLastTs = 0;
        userSettings.whisperPairedOnce = true;
        saveSettings();
      }
      whisperRoom = code;
      userSettings.whisperRoom = code;
      saveSettings();
      renderWhisperPairBar();
      startWhisperSync();
      startRoomDataSync();
      pushDataToServer(); // 首次连接立刻把本机数据推上去
      showToast('已连接！让另一半输入相同暗号即可互通');
    });
    if (copy) copy.addEventListener('click', function () {
      if (navigator.clipboard) navigator.clipboard.writeText(whisperRoom).then(function(){ showToast('暗号已复制'); }, function(){ showToast('复制失败，请手动选择'); });
      else showToast('当前环境不支持复制');
    });
    if (change) change.addEventListener('click', function () {
      whisperRoom = '';
      userSettings.whisperRoom = '';
      saveSettings();
      stopWhisperSync();
      stopRoomDataSync();
      setWhisperSyncStatus('offline');
      renderWhisperPairBar();
      showToast('已断开，可重新设置暗号');
    });
    renderWhisperPairBar();
  }

  // ========== 全量数据同步（待办/用药/湿疹/美食/旅行/时间轴，不含悄悄话） ==========
  var roomDataLm = 0;
  var roomDataSyncTimer = null;
  var _origSaveData = saveData;

  function pushDataToServer() {
    if (!whisperRoom) return;
    var d = JSON.parse(JSON.stringify(appData));
    fetch('/api/rooms/' + encodeURIComponent(whisperRoom) + '/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: d })
    }).then(function (r) { return r.json(); }).then(function (rd) {
      if (rd && rd.lm) roomDataLm = rd.lm;
    }).catch(function () {});
  }

  // 每次本地保存后自动推送到共享房间
  saveData = function () {
    _origSaveData();
    if (whisperRoom) pushDataToServer();
  };

  function mergeRoomData(srvData) {
    if (!srvData || typeof srvData !== 'object') return false;
    var keys = ['todos', 'medications', 'eczemaRecords', 'foods', 'travels', 'travelPlaces', 'timeline'];
    var changed = false;
    keys.forEach(function (k) {
      if (!Array.isArray(srvData[k])) return;
      var srvById = {};
      srvData[k].forEach(function (srv) { srvById[srv.id] = true; });
      var localById = {};
      appData[k].forEach(function (item, i) { localById[item.id] = i; });
      // 更新已有 + 添加新的
      srvData[k].forEach(function (srv) {
        if (localById[srv.id] !== undefined) {
          appData[k][localById[srv.id]] = srv;
        } else {
          appData[k].push(srv);
        }
        changed = true;
      });
      // 删除本地有但服务端没有的
      var beforeLen = appData[k].length;
      appData[k] = appData[k].filter(function (item) { return srvById[item.id]; });
      if (appData[k].length !== beforeLen) changed = true;
    });
    // 悄悄话不在此同步（走独立的 whisper 端点），但确保数组存在
    if (!Array.isArray(appData.whispers)) appData.whispers = [];
    // 同步在一起日期
    if (srvData.togetherDate && srvData.togetherDate !== appData.togetherDate) {
      appData.togetherDate = srvData.togetherDate;
      changed = true;
    }
    return changed;
  }

  function rerenderAll() {
    // 待办：清空并重渲全部项
    var todoListEl = $('#todoList'); if (todoListEl) { todoListEl.innerHTML = ''; appData.todos.forEach(function (t) { renderTodo(t, false); }); }
    // 用药
    var medList = $('#medicationList'); if (medList) { medList.innerHTML = ''; appData.medications.forEach(function (m) { renderMedication(m); }); }
    // 湿疹
    var ecList = $('#eczemaList'); if (ecList) { ecList.innerHTML = ''; appData.eczemaRecords.forEach(function (e) { renderEczema(e); }); }
    // 美食
    var foodGrid = $('#foodGrid'); if (foodGrid) { foodGrid.innerHTML = ''; appData.foods.forEach(function (f) { renderFood(f, false); }); }
    // 旅行
    var travelGrid = $('#travelGrid'); if (travelGrid) { travelGrid.innerHTML = ''; appData.travels.forEach(function (t) { renderTravel(t); }); }
    // 时间轴
    var tlList = $('#timelineList'); if (tlList) { tlList.innerHTML = ''; appData.timeline.forEach(function (t) { renderTimelineEvent(t, false); }); }
    // 统计数
    updateHomeStats();
    updateTodoCount();
    updateFoodCount();
    updateTravelCount();
    // 在一起天数刷新（对方可能改了日期）
    updateTogetherDisplay();
    // 足迹地图重新打点
    if (typeof placeMarkers !== 'undefined' && typeof travelLeafletMap !== 'undefined') {
      Object.values(placeMarkers).forEach(function (m) { travelLeafletMap.removeLayer(m); });
      for (var k in placeMarkers) delete placeMarkers[k];
      appData.travelPlaces.forEach(function (p) { if (typeof renderPlace === 'function') renderPlace(p); });
      if (typeof renderRoute === 'function') renderRoute();
    }
    saveData();
  }

  function pollRoomData() {
    if (!whisperRoom) return;
    fetch('/api/rooms/' + encodeURIComponent(whisperRoom) + '/data')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || d.status !== 'ok' || !d.data) return;
        // 本地优先恢复：服务端 lm=0（重启/新房间）但本地有数据 → 推送本地恢复
        var syncKeys = ['todos', 'medications', 'eczemaRecords', 'foods', 'travels', 'travelPlaces', 'timeline'];
        var localCount = 0;
        syncKeys.forEach(function (k) { if (Array.isArray(appData[k])) localCount += appData[k].length; });
        if (d.lm === 0 && localCount > 0) {
          pushDataToServer();
          roomDataLm = 0;
          return;
        }
        // 正常增量同步
        if (d.lm > roomDataLm) {
          roomDataLm = d.lm;
          var serverCount = 0;
          syncKeys.forEach(function (k) { if (Array.isArray(d.data[k])) serverCount += d.data[k].length; });
          if (serverCount === 0 && localCount > 0) {
            pushDataToServer();
            return;
          }
          if (mergeRoomData(d.data)) rerenderAll();
        }
      }).catch(function () {});
  }

  function startRoomDataSync() {
    stopRoomDataSync();
    pollRoomData();
    roomDataSyncTimer = setInterval(pollRoomData, 5000);
  }

  function stopRoomDataSync() {
    if (roomDataSyncTimer) { clearInterval(roomDataSyncTimer); roomDataSyncTimer = null; }
  }

  // ========== 首页统计更新 ==========
  function updateHomeStats() {
    const meds = appData.medications;
    const done = meds.filter(m => m.status === 'done').length;
    const total = meds.length;
    const medEl = $('#statMed');
    const sumMed = $('#summaryMed');
    if (medEl) medEl.textContent = done + '/' + total;
    if (sumMed) sumMed.textContent = '今日用药 ' + done + '/' + total;

    const todos = appData.todos;
    const undone = todos.filter(t => !t.done).length;
    const todoEl = $('#statTodo');
    const sumTodo = $('#summaryTodo');
    if (todoEl) todoEl.textContent = undone + '/' + todos.length;
    if (sumTodo) sumTodo.textContent = '今日待办 ' + undone + '/' + todos.length;
  }

  // ========== 设置页功能 ==========
  const settingExport = $('#settingExport');
  if (settingExport) {
    settingExport.addEventListener('click', () => {
      const json = JSON.stringify(appData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '甜蜜工作台-数据导出-' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('数据已导出');
    });
  }

  const settingEmergency = $('#settingEmergency');
  if (settingEmergency) {
    settingEmergency.addEventListener('click', () => {
      const current = userSettings.emergencyContact || '';
      openEmergencySheet(current);
    });
  }

  function openEmergencySheet(currentVal) {
    sheetTitle.textContent = '紧急联系人';
    sheetBody.innerHTML = `
      <div class="form-field">
        <label class="form-label">联系人姓名</label>
        <input class="form-input" type="text" id="f-em-name" placeholder="如：妈妈" value="${escHtml(currentVal ? currentVal.name : '')}" maxlength="20">
      </div>
      <div class="form-field">
        <label class="form-label">联系电话</label>
        <input class="form-input" type="tel" id="f-em-phone" placeholder="如：13800138000" value="${escHtml(currentVal ? currentVal.phone : '')}" maxlength="20">
      </div>
    `;
    sheetConfirm.onclick = () => {
      const name = $('#f-em-name', sheetBody).value.trim();
      const phone = $('#f-em-phone', sheetBody).value.trim();
      if (!name && !phone) {
        userSettings.emergencyContact = null;
        const desc = $('#emergencyDesc');
        if (desc) desc.textContent = '未设置';
        showToast('已清除紧急联系人');
      } else {
        userSettings.emergencyContact = { name, phone };
        const desc = $('#emergencyDesc');
        if (desc) desc.textContent = name + (phone ? ' · ' + phone : '');
        showToast('已保存');
      }
      saveSettings();
      closeSheet();
      sheetConfirm.onclick = null;
    };
    sheetOverlay.classList.add('show');
    bottomSheet.classList.add('show');
  }

  const settingGift = $('#settingGift');
  if (settingGift) {
    settingGift.addEventListener('click', () => {
      openGiftSheet();
    });
  }

  function openGiftSheet() {
    const gifts = userSettings.giftIdeas || [];
    sheetTitle.textContent = '礼物灵感';
    sheetBody.innerHTML = `
      <div class="form-field">
        <label class="form-label">添加灵感（${gifts.length}条）</label>
        <div style="display:flex;gap:8px;">
          <input class="form-input" type="text" id="f-gift-input" placeholder="如：纪念日手写信" maxlength="30" style="flex:1">
          <button class="sheet-confirm" id="f-gift-add" type="button" style="padding:12px 16px;">添加</button>
        </div>
      </div>
      <div id="giftList" style="display:flex;flex-direction:column;gap:8px;">
        ${gifts.map((g, i) => `<div class="gift-item" style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--bg-cream);border-radius:12px;">
          <span style="flex:1;font-size:14px;">${escHtml(g)}</span>
          <button class="gift-del" data-idx="${i}" style="border:none;background:#FCEEEE;color:#E57373;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;">×</button>
        </div>`).join('') || '<p style="text-align:center;color:var(--text-tertiary);font-size:13px;padding:20px 0;">还没有添加灵感</p>'}
      </div>
    `;
    const addBtn = $('#f-gift-add', sheetBody);
    const input = $('#f-gift-input', sheetBody);
    if (addBtn) addBtn.addEventListener('click', () => {
      const val = input.value.trim();
      if (!val) return;
      if (!userSettings.giftIdeas) userSettings.giftIdeas = [];
      userSettings.giftIdeas.push(val);
      saveSettings();
      openGiftSheet(); // 重新渲染
      input && $('#f-gift-input') && $('#f-gift-input').focus();
    });
    if (input) input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && addBtn) addBtn.click();
    });
    $$('.gift-del', sheetBody).forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        userSettings.giftIdeas.splice(idx, 1);
        saveSettings();
        openGiftSheet();
      });
    });
    sheetConfirm.onclick = () => { closeSheet(); sheetConfirm.onclick = null; };
    sheetConfirm.textContent = '完成';
    sheetOverlay.classList.add('show');
    bottomSheet.classList.add('show');
  }

  const settingClear = $('#settingClear');
  if (settingClear) {
    settingClear.addEventListener('click', () => {
      showConfirm('清除所有数据', '此操作将删除所有记录并重置为初始状态，确定继续吗？', () => {
        appData = getSeedData();
        saveData();
        showToast('已重置');
        setTimeout(() => location.reload(), 800);
      }, true);
    });
  }

  // ========== 首页用药状态切换 ==========
  $$('#homeMedList .med-status').forEach(btn => {
    btn.addEventListener('click', () => {
      const isDone = btn.classList.contains('done');
      if (isDone) {
        btn.classList.remove('done');
        btn.classList.add('pending');
        btn.textContent = '未服';
      } else {
        btn.classList.remove('pending');
        btn.classList.add('done');
        btn.textContent = '已服';
      }
    });
  });

  // ========== 表单配置 ==========
  const SHEET_CONFIGS = {
    'add-todo': {
      title: '新建待办',
      successMsg: '待办已添加',
      body: `
        <div class="form-field">
          <label class="form-label">标题</label>
          <input class="form-input" type="text" id="f-title" placeholder="输入待办事项…" maxlength="30">
        </div>
        <div class="form-field">
          <label class="form-label">分类</label>
          <div class="form-chips" id="f-category">
            <span class="form-chip active" data-val="家庭">家庭</span>
            <span class="form-chip" data-val="健康">健康</span>
            <span class="form-chip" data-val="工作">工作</span>
            <span class="form-chip" data-val="生活">生活</span>
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label class="form-label">日期</label>
            <select class="form-select" id="f-when">
              <option value="今日">今日</option>
              <option value="明天">明天</option>
              <option value="本周">本周</option>
              <option value="下周">下周</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label">时间</label>
            <input class="form-input" type="time" id="f-time" value="09:00">
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">优先级</label>
          <div class="form-chips" id="f-priority">
            <span class="form-chip" data-val="1">★</span>
            <span class="form-chip active" data-val="2">★★</span>
            <span class="form-chip" data-val="3">★★★</span>
          </div>
        </div>
      `,
      onMount(c) { bindChips(c, '#f-category'); bindChips(c, '#f-priority'); },
      onSubmit(c) {
        const title = $('#f-title', c).value.trim();
        if (!title) { showToast('请输入标题'); return false; }
        const item = {
          id: uid(), title,
          category: getChip(c, '#f-category') || '家庭',
          when: $('#f-when', c).value,
          time: $('#f-time', c).value,
          priority: parseInt(getChip(c, '#f-priority') || '2'),
          done: false
        };
        appData.todos.unshift(item);
        saveData();
        renderTodo(item, true);
        updateTodoCount();
        updateHomeStats();
        return true;
      }
    },

    'add-medication': {
      title: '添加用药',
      successMsg: '用药已添加',
      body: `
        <div class="form-field">
          <label class="form-label">药品名称</label>
          <input class="form-input" type="text" id="f-med-name" placeholder="如：维生素D" maxlength="20">
        </div>
        <div class="form-row">
          <div class="form-field">
            <label class="form-label">服用时间</label>
            <select class="form-select" id="f-med-when">
              <option value="早饭后">早饭后</option>
              <option value="午饭后">午饭后</option>
              <option value="晚饭后">晚饭后</option>
              <option value="睡前">睡前</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label">剂量</label>
            <input class="form-input" type="text" id="f-med-dose" placeholder="如：1片" value="1片">
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">状态</label>
          <div class="form-chips" id="f-med-status">
            <span class="form-chip active" data-val="pending">未服</span>
            <span class="form-chip" data-val="done">已服</span>
          </div>
        </div>
      `,
      onMount(c) { bindChips(c, '#f-med-status'); },
      onSubmit(c) {
        const name = $('#f-med-name', c).value.trim();
        if (!name) { showToast('请输入药品名称'); return false; }
        const item = {
          id: uid(), name,
          when: $('#f-med-when', c).value,
          dose: $('#f-med-dose', c).value.trim() || '1片',
          status: getChip(c, '#f-med-status') || 'pending'
        };
        appData.medications.unshift(item);
        saveData();
        rerenderMedications();
        updateHomeStats();
        return true;
      }
    },

    'add-eczema': {
      title: '添加湿疹记录',
      successMsg: '记录已保存',
      body: `
        <div class="form-field">
          <label class="form-label">严重程度</label>
          <div class="severity-slider">
            <input type="range" id="f-eczema-severity" min="0" max="5" step="0.5" value="2.5">
            <span class="severity-value" id="f-eczema-sev-val">2.5</span>
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">当前阶段</label>
          <div class="form-chips" id="f-eczema-stage">
            <span class="form-chip active" data-val="爆发期">爆发期</span>
            <span class="form-chip" data-val="好转期">好转期</span>
            <span class="form-chip" data-val="恢复期">恢复期</span>
            <span class="form-chip" data-val="反复">反复</span>
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">部位（可多选）</label>
          <div class="form-chips" id="f-eczema-parts">
            <span class="form-chip" data-val="脸颊">脸颊</span>
            <span class="form-chip" data-val="额头">额头</span>
            <span class="form-chip" data-val="下巴">下巴</span>
            <span class="form-chip" data-val="手臂">手臂</span>
            <span class="form-chip" data-val="腿部">腿部</span>
            <span class="form-chip" data-val="躯干">躯干</span>
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">备注</label>
          <textarea class="form-textarea" id="f-eczema-note" placeholder="记录诱因、用药情况等…" maxlength="200"></textarea>
        </div>
      `,
      onMount(c) {
        bindChips(c, '#f-eczema-stage');
        bindChipsMulti(c, '#f-eczema-parts');
        const slider = $('#f-eczema-severity', c);
        const valEl = $('#f-eczema-sev-val', c);
        slider.addEventListener('input', () => { valEl.textContent = slider.value; });
      },
      onSubmit(c) {
        const item = {
          id: uid(),
          severity: parseFloat($('#f-eczema-severity', c).value),
          stage: getChip(c, '#f-eczema-stage') || '爆发期',
          parts: getChipsMulti(c, '#f-eczema-parts'),
          note: $('#f-eczema-note', c).value.trim(),
          date: new Date().toLocaleDateString('zh-CN')
        };
        appData.eczemaRecords.unshift(item);
        saveData();
        renderEczema(item);
        return true;
      }
    },

    'add-food': {
      title: '收藏美食',
      successMsg: '美食已收藏',
      body: `
        <div class="form-field">
          <label class="form-label">美食名称</label>
          <input class="form-input" type="text" id="f-food-name" placeholder="如：红烧肉" maxlength="20">
        </div>
          <div class="form-field">
            <label class="form-label">分类</label>
            <div class="form-chips" id="f-food-cat">
              <span class="form-chip active" data-val="主食">主食</span>
              <span class="form-chip" data-val="蔬菜">蔬菜</span>
              <span class="form-chip" data-val="荤菜">荤菜</span>
              <span class="form-chip" data-val="汤品">汤品</span>
              <span class="form-chip" data-val="甜品">甜品</span>
              <span class="form-chip" data-val="饮品">饮品</span>
            </div>
          </div>
        <div class="form-field">
          <label class="form-label">评分</label>
          <div class="form-chips" id="f-food-rating">
            <span class="form-chip" data-val="1">★</span>
            <span class="form-chip" data-val="2">★★</span>
            <span class="form-chip active" data-val="3">★★★</span>
            <span class="form-chip" data-val="4">★★★★</span>
            <span class="form-chip" data-val="5">★★★★★</span>
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">选一张可爱封面</label>
          <div class="image-picker" id="f-food-images">
            <button type="button" class="img-thumb active" data-img="images/food-noodles.png"><img src="images/food-noodles.png" alt=""></button>
            <button type="button" class="img-thumb" data-img="images/food-fish.png"><img src="images/food-fish.png" alt=""></button>
            <button type="button" class="img-thumb" data-img="images/food-soup.png"><img src="images/food-soup.png" alt=""></button>
            <button type="button" class="img-thumb" data-img="images/food-yogurt.png"><img src="images/food-yogurt.png" alt=""></button>
            <button type="button" class="img-thumb" data-img="images/food-cake.png"><img src="images/food-cake.png" alt=""></button>
            <button type="button" class="img-thumb" data-img="images/food-sushi.png"><img src="images/food-sushi.png" alt=""></button>
            <button type="button" class="img-thumb" data-img="images/food-salad.png"><img src="images/food-salad.png" alt=""></button>
            <button type="button" class="img-thumb" data-img="images/food-toast.png"><img src="images/food-toast.png" alt=""></button>
            <button type="button" class="img-thumb" data-img="images/food-milktea.png"><img src="images/food-milktea.png" alt=""></button>
            <button type="button" class="img-thumb" data-img="images/food-dumpling.png"><img src="images/food-dumpling.png" alt=""></button>
          </div>
          <p class="form-hint">点击缩略图选择，再次点击可取消使用纯色背景</p>
        </div>
        <div class="form-field">
          <label class="form-label">做法视频链接（可多个）</label>
          <div class="video-links" id="f-food-videos">
            <div class="video-link-row">
              <input class="form-input video-link-input" type="url" placeholder="粘贴视频链接，如 bilibili / 抖音…" maxlength="500">
              <button type="button" class="video-link-del" aria-label="删除">×</button>
            </div>
          </div>
          <button type="button" class="add-link-btn" id="f-food-addlink">+ 添加更多链接</button>
        </div>
        <div class="form-field">
          <label class="form-label">备注</label>
          <textarea class="form-textarea" id="f-food-note" placeholder="餐厅、做法、口味…" maxlength="200"></textarea>
        </div>
      `,
      onMount(c) {
        bindChips(c, '#f-food-cat');
        bindChips(c, '#f-food-rating');
        const picker = $('#f-food-images', c);
        if (picker) {
          const thumbs = $$('.img-thumb', picker);
          thumbs.forEach(t => {
            t.addEventListener('click', () => {
              const wasActive = t.classList.contains('active');
              thumbs.forEach(x => x.classList.remove('active'));
              if (!wasActive) t.classList.add('active');
            });
          });
        }
        // 多视频链接：添加 / 删除行
        const vWrap = $('#f-food-videos', c);
        const addLink = $('#f-food-addlink', c);
        if (addLink) addLink.addEventListener('click', () => {
          const row = document.createElement('div');
          row.className = 'video-link-row';
          row.innerHTML = '<input class="form-input video-link-input" type="url" placeholder="粘贴视频链接…" maxlength="500"><button type="button" class="video-link-del" aria-label="删除">×</button>';
          vWrap.appendChild(row);
          row.querySelector('.video-link-input').focus();
        });
        if (vWrap) {
          vWrap.addEventListener('click', (e) => {
            if (e.target.classList.contains('video-link-del')) {
              const rows = vWrap.querySelectorAll('.video-link-row');
              if (rows.length > 1) e.target.closest('.video-link-row').remove();
            }
          });
        }
      },
      onSubmit(c) {
        const name = $('#f-food-name', c).value.trim();
        if (!name) { showToast('请输入美食名称'); return false; }
        const activeThumb = $('#f-food-images .img-thumb.active', c);
        const vInputs = $$('.video-link-input', c);
        const videoUrls = vInputs
          .map(i => i.value.trim())
          .filter(v => v && /^https?:\/\//.test(v));
        const videos = videoUrls.map(u => ({ url: u, title: '', summary: null, analyzing: false }));
        const item = {
          id: uid(), name,
          category: getChip(c, '#f-food-cat') || '主食',
          rating: parseInt(getChip(c, '#f-food-rating') || '3'),
          note: $('#f-food-note', c).value.trim(),
          image: activeThumb ? activeThumb.dataset.img : '',
          videos: videos
        };
        appData.foods.unshift(item);
        saveData();
        renderFood(item, true);
        updateFoodCount();
        analyzeFoodVideos(item);
        return true;
      }
    },

    'add-travel': {
      title: '添加旅行回忆',
      successMsg: '回忆已记录',
      body: `
        <div class="form-field">
          <label class="form-label">目的地</label>
          <input class="form-input" type="text" id="f-travel-loc" placeholder="如：成都" maxlength="20">
        </div>
        <div class="form-field">
          <label class="form-label">旅行标题</label>
          <input class="form-input" type="text" id="f-travel-title" placeholder="如：熊猫基地之旅" maxlength="30">
        </div>
        <div class="form-row">
          <div class="form-field">
            <label class="form-label">日期</label>
            <input class="form-input" type="date" id="f-travel-date">
          </div>
          <div class="form-field">
            <label class="form-label">主题色</label>
            <div class="form-chips" id="f-travel-color">
              <span class="form-chip active" data-val="#4A7A9E" style="background:#4A7A9E;color:white;border-color:#4A7A9E">蓝</span>
              <span class="form-chip" data-val="#5A6B8E" style="background:#5A6B8E;color:white;border-color:#5A6B8E">靛</span>
              <span class="form-chip" data-val="#6B7A5E" style="background:#6B7A5E;color:white;border-color:#6B7A5E">绿</span>
              <span class="form-chip" data-val="#7A5E6B" style="background:#7A5E6B;color:white;border-color:#7A5E6B">紫</span>
            </div>
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">旅行封面（可选）</label>
          <div class="photo-upload">
            <input type="file" accept="image/*" id="f-travel-cover" hidden>
            <div class="photo-upload-box" id="f-travel-cover-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              <span>点击添加封面照片</span>
            </div>
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">标签</label>
          <input class="form-input" type="text" id="f-travel-tags" placeholder="如：浪漫、美食" maxlength="30">
        </div>
      `,
      onMount(c) {
        bindChips(c, '#f-travel-color');
        const today = new Date().toISOString().split('T')[0];
        $('#f-travel-date', c).value = today;
        pendingTravelCover = null;
        const fileInput = $('#f-travel-cover', c);
        const box = $('#f-travel-cover-box', c);
        if (fileInput && box) {
          box.addEventListener('click', () => fileInput.click());
          fileInput.addEventListener('change', () => {
            const f = fileInput.files && fileInput.files[0];
            if (!f) return;
            fileToDataURL(f, 1000, 1000, (dataUrl) => {
              if (!dataUrl) { showToast('图片读取失败'); return; }
              pendingTravelCover = dataUrl;
              box.style.backgroundImage = "url('" + dataUrl + "')";
              box.style.backgroundSize = 'cover';
              box.style.backgroundPosition = 'center';
              box.classList.add('has-image');
            });
          });
        }
      },
      onSubmit(c) {
        const loc = $('#f-travel-loc', c).value.trim();
        if (!loc) { showToast('请输入目的地'); return false; }
        const date = $('#f-travel-date', c).value;
        const item = {
          id: uid(),
          location: loc,
          title: $('#f-travel-title', c).value.trim() || loc + '之旅',
          date: date ? date.replace(/-/g, '.') : '',
          tags: $('#f-travel-tags', c).value.trim(),
          color: getChip(c, '#f-travel-color') || '#4A7A9E',
          cover: pendingTravelCover
        };
        appData.travels.unshift(item);
        saveData();
        renderTravel(item);
        updateTravelCount();
        return true;
      }
    },

    'add-timeline': {
      title: '添加时间轴',
      successMsg: '已记录这一刻',
      body: `
        <div class="form-field">
          <label class="form-label">日期</label>
          <input class="form-input" type="date" id="f-tl-date">
        </div>
        <div class="form-field">
          <label class="form-label">标题</label>
          <input class="form-input" type="text" id="f-tl-title" placeholder="如：第一次看海" maxlength="20">
        </div>
        <div class="form-field">
          <label class="form-label">描述</label>
          <textarea class="form-textarea" id="f-tl-desc" placeholder="记下这一天的故事…" maxlength="60"></textarea>
        </div>
      `,
      onMount(c) {
        const today = new Date().toISOString().split('T')[0];
        $('#f-tl-date', c).value = today;
      },
      onSubmit(c) {
        const title = $('#f-tl-title', c).value.trim();
        if (!title) { showToast('请输入标题'); return false; }
        const date = $('#f-tl-date', c).value ? $('#f-tl-date', c).value.replace(/-/g, '.') : '';
        const item = {
          id: uid(),
          date,
          title,
          desc: $('#f-tl-desc', c).value.trim(),
          active: false
        };
        appData.timeline.unshift(item);
        saveData();
        renderTimelineEvent(item, true);
        return true;
      }
    },

    'add-place': {
      title: '标记一个足迹',
      successMsg: '足迹已记录',
      body: `
        <div class="form-field">
          <label class="form-label">地点名称</label>
          <input class="form-input" type="text" id="f-place-name" placeholder="如：成都 · 宽窄巷子" maxlength="20">
        </div>
        <div class="form-field">
          <label class="form-label">日期</label>
          <input class="form-input" type="date" id="f-place-date">
        </div>
        <div class="form-field">
          <label class="form-label">备注</label>
          <input class="form-input" type="text" id="f-place-note" placeholder="如：好吃的小吃街" maxlength="30">
        </div>
      `,
      onMount(c) {
        const today = new Date().toISOString().split('T')[0];
        $('#f-place-date', c).value = today;
      },
      onSubmit(c) {
        const name = $('#f-place-name', c).value.trim();
        if (!name) { showToast('请输入地点名称'); return false; }
        if (!pendingMapPoint) { showToast('请在地图上点击位置'); return false; }
        const item = {
          id: uid(),
          name,
          date: $('#f-place-date', c).value ? $('#f-place-date', c).value.replace(/-/g, '.') : '',
          note: $('#f-place-note', c).value.trim(),
          lat: pendingMapPoint.lat,
          lng: pendingMapPoint.lng
        };
        appData.travelPlaces.unshift(item);
        saveData();
        renderPlace(item);
        renderRoute();
        const g = wgs84ToGcj02(item.lat, item.lng);
        if (travelLeafletMap) travelLeafletMap.setView([g[0], g[1]], 10);
        updateMapEmpty();
        pendingMapPoint = null;
        return true;
      }
    },

    'edit-together-date': {
      title: '设置在一起日期',
      successMsg: '在一起日期已更新',
      body: `
        <div class="form-field">
          <label class="form-label">选择你们在一起的日期</label>
          <input class="form-input" type="date" id="f-together-date">
        </div>
        <p style="font-size:13px;color:#888;margin-top:8px;line-height:1.5;">设置后，首页和"我们"页的天数会自动更新。如果已连接暗号，对方也会同步看到新日期。</p>
      `,
      onMount(c) {
        ensureTogetherDate();
        $('#f-together-date', c).value = appData.togetherDate;
      },
      onSubmit(c) {
        var val = $('#f-together-date', c).value;
        if (!val) { showToast('请选择日期'); return false; }
        appData.togetherDate = val;
        saveData();
        updateTogetherDisplay();
        return true;
      }
    }
  };

  // ========== 绑定添加按钮 ==========
  $$('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSheet(btn.dataset.action);
    });
  });

  // ========== 恢复紧急联系人显示 ==========
  if (userSettings.emergencyContact) {
    const desc = $('#emergencyDesc');
    if (desc) desc.textContent = userSettings.emergencyContact.name + (userSettings.emergencyContact.phone ? ' · ' + userSettings.emergencyContact.phone : '');
  }

  // ========== 初始化 ==========
  // 渲染用户添加的数据（种子数据已在 HTML 中）
  function init() {
    // 如果 localStorage 有数据，补充渲染用户添加的非种子数据
    const stored = loadData();
    if (stored) {
      appData.todos.filter(t => !t.id.startsWith('seed-')).forEach(item => renderTodo(item, false));
      appData.medications.filter(m => !m.id.startsWith('seed-')).forEach(item => renderMedication(item));
      appData.eczemaRecords.filter(e => !e.id.startsWith('seed-')).forEach(item => renderEczema(item));
      appData.travels.filter(t => !t.id.startsWith('seed-')).forEach(item => renderTravel(item));
    }
    // 悄悄话：始终从数据渲染（含种子演示）；已同步消息以 from/ts 为准
    appData.whispers.forEach(item => renderWhisper(item));
    whisperLastTs = appData.whispers.reduce(function (mx, w) { return (w.ts && w.ts > mx) ? w.ts : mx; }, 0);
    bindWhisperPair();
    if (whisperRoom) { startWhisperSync(); startRoomDataSync(); pushDataToServer(); }
    // 美食完全数据驱动：始终从数据渲染（含种子），删除后不会复活
    appData.foods.forEach(item => renderFood(item, false));
    // 时间轴完全数据驱动：从数据渲染（含种子）
    appData.timeline.forEach(item => renderTimelineEvent(item, false));
    // 足迹地图：初始化 Leaflet 并渲染已有足迹
    initMap();
    updateHomeStats();
    updateTodoCount();
    updateFoodCount();
    updateTravelCount();
  }

  init();
  switchScreen('home');
})();
