/*
 * ui-template computed-style exporter (schema: uikit-export/1)
 * 从真实产品页面导出 token 实测值，替代截图取色估草值。
 *
 * 人工用法（真实页面 DevTools Console，只读，不改页面任何状态）：
 *   1. 粘贴本文件整段 → 回车（安装，幂等）
 *   2. Alt+点击 打标元素（每次提示输入标签，Enter 确认；Esc 取消本次）
 *   3. __uikit.dump() → 复制返回的 JSON，存为 uikit-<light|dark>-<page>.json
 *   4. 换页/换主题后重复 2–3；卸载 __uikit.uninstall()
 *
 * agent 代跑（ZCode in-app browser 等）要点：
 *   - 先 browser.user.openTabs() 找到目标页再 claimTab，受控列表为空是常态
 *   - locator.evaluate 跑在隔离 world，看不到页面主 world 的 __uikit——
 *     打标必须走页面侧 evaluate + DOM 选择器（__uikit.tag(el, tag) / 'selector', tag）
 *   - 全量 goto() 会清掉已注入脚本（SPA 内导航不清），导航后要重注入
 *   - evaluate 单次有 3s 上限：__uikit.scanReset() → 循环 __uikit.scanStep(6000)
 *     直到 done，再 __uikit.dump()
 *   - ARIA 快照里同名链接可能不止一个（如侧栏 Issues vs Import issues），
 *     禁止 nth 定位；先取快照里目标链接的真实 href 再导航
 *
 * dump 结构（schema: uikit-export/1）：
 *   vars.resolved :root 上所有 CSS 变量的最终值（var() 已替换）
 *   freq          全页元素按属性频次榜（字号/字重/行高/前景/背景/边框色+宽/圆角/阴影/内边距/gap，
 *                 各 Top12，附样例元素；边框值形如 "<color> @ <width> (top|bottom)"）
 *   picks         打标元素，带 computed style 子集 + 几何 + bgChain（向上找第一个不透明底）
 *
 * 下一步：换算与契约验证用同目录 map-tokens.mjs（lch/hex → oklch，校验器口径）。
 */
(() => {
  if (window.__uikit) { console.warn('[uikit] 已安装过，直接 Alt+点击 / __uikit.dump()'); return; }

  const PICK_PROPS = [
    'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
    'color', 'background-color', 'background-image',
    'border-top-color', 'border-top-width', 'border-top-style', 'border-bottom-color', 'border-bottom-width',
    'border-radius', 'outline', 'outline-offset', 'box-shadow',
    'padding', 'gap', 'transition', 'opacity'
  ];
  const FREQ_PROPS = [
    'font-size', 'font-weight', 'line-height', 'color', 'background-color',
    'border-top-color', 'border-bottom-color', 'border-radius', 'box-shadow', 'padding', 'gap'
  ];
  const MAX_ELEMENTS = 30000;

  const describe = (el) => {
    const cls = el.classList && el.classList.length ? '.' + [...el.classList].slice(0, 4).join('.') : '';
    const text = (el.textContent || '').trim().slice(0, 40);
    return `<${el.tagName.toLowerCase()}${cls}>${text ? ` "${text}"` : ''}`;
  };
  const val = (cs, p) => (cs.getPropertyValue(p) || '').trim();
  const alphaOf = (c) => { const m = (c || '').match(/[/,]\s*([\d.]+)\s*\)$/); return m ? parseFloat(m[1]) : 1; };
  const isOpaque = (c) => !!c && c !== 'transparent' && alphaOf(c) > 0.95;

  const resolveVars = () => {
    const cs = getComputedStyle(document.documentElement);
    const resolved = {};
    for (let i = 0; i < cs.length; i++) {
      const name = cs[i];
      if (name.startsWith('--')) resolved[name] = cs.getPropertyValue(name).trim();
    }
    return resolved;
  };

  // freq 扫描可分批（evaluate 3s 上限）：scanReset → 循环 scanStep → dump 组装
  const scanState = Object.fromEntries(FREQ_PROPS.map((p) => [p, new Map()]));
  let scanCursor = 0;
  const scanReset = () => {
    for (const p of FREQ_PROPS) scanState[p] = new Map();
    scanCursor = 0;
  };
  const scanStep = (batch = 4000) => {
    const els = document.body.querySelectorAll('*');
    const limit = Math.min(els.length, MAX_ELEMENTS);
    const end = Math.min(scanCursor + batch, limit);
    for (let i = scanCursor; i < end; i++) {
      const el = els[i];
      if (!(el instanceof HTMLElement)) continue;
      const cs = getComputedStyle(el);
      for (const p of FREQ_PROPS) {
        let v = val(cs, p);
        if (!v) continue;
        if (p === 'border-top-color' || p === 'border-bottom-color') {
          const side = p === 'border-top-color' ? 'top' : 'bottom';
          if (val(cs, `border-${side}-style`) === 'none' || val(cs, `border-${side}-width`) === '0px') continue;
          v = `${v} @ ${val(cs, `border-${side}-width`)} (${side})`;
        }
        if (p === 'box-shadow' && v === 'none') continue;
        if (p === 'background-color' && (v === 'rgba(0, 0, 0, 0)' || v === 'transparent')) continue;
        const b = scanState[p];
        const e = b.get(v) || { count: 0, samples: [] };
        e.count++;
        const d = describe(el);
        if (e.samples.length < 3 && !e.samples.includes(d)) e.samples.push(d);
        b.set(v, e);
      }
    }
    scanCursor = end;
    return { processed: end, total: limit, done: end >= limit };
  };
  const scanAssemble = () => {
    const out = {};
    for (const [p, b] of Object.entries(scanState)) {
      out[p] = [...b.entries()]
        .map(([value, e]) => ({ value, count: e.count, samples: e.samples }))
        .sort((a, b2) => b2.count - a.count)
        .slice(0, 12);
    }
    return out;
  };
  const scanFreq = () => { scanReset(); let r; do { r = scanStep(); } while (!r.done); return scanAssemble(); };

  const bgChain = (el) => {
    const chain = [];
    let node = el;
    while (node instanceof Element && chain.length < 8) {
      const c = val(getComputedStyle(node), 'background-color');
      chain.push({ el: describe(node), 'background-color': c });
      if (isOpaque(c)) break;
      node = node.parentElement;
    }
    return chain;
  };

  const snapshotPick = (el, tag) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag,
      el: describe(el),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      classes: [...el.classList].slice(0, 10),
      styles: Object.fromEntries(PICK_PROPS.map((p) => [p, val(cs, p)])),
      bgChain: bgChain(el)
    };
  };

  const state = { picks: [] };
  const onClick = (e) => {
    if (!e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    const last = state.picks.length ? state.picks[state.picks.length - 1].tag : '';
    const tag = window.prompt('[uikit] 标签（如 sidebar-item / selected-row / secondary-text / card / card-border / input / button-primary）', last);
    if (tag === null) return;
    const pick = snapshotPick(e.target, tag || `pick-${state.picks.length + 1}`);
    state.picks.push(pick);
    console.log('[uikit] +pick', pick.tag, pick.el);
  };
  document.addEventListener('click', onClick, true);

  window.__uikit = {
    picks: () => state.picks,
    tag(elOrSelector, tag) {
      const el = typeof elOrSelector === 'string' ? document.querySelector(elOrSelector) : elOrSelector;
      if (!el) return null;
      const pick = snapshotPick(el, tag);
      state.picks.push(pick);
      return pick;
    },
    picksReset: () => { state.picks.length = 0; },
    scan: scanFreq,
    scanReset,
    scanStep,
    scanAssemble,
    vars: resolveVars,
    dump() {
      const data = {
        schema: 'uikit-export/1',
        url: location.href,
        title: document.title,
        capturedAt: new Date().toISOString(),
        prefersColorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
        htmlClasses: [...document.documentElement.classList],
        htmlThemeVars: Object.fromEntries(
          [...document.documentElement.style]
            .filter((n) => n.includes('color') || n.includes('bg'))
            .map((n) => [n, document.documentElement.style.getPropertyValue(n).trim()])
        ),
        vars: { resolved: resolveVars() },
        freq: scanAssemble(),
        picks: state.picks
      };
      console.log(`[uikit] dump 完成：${Object.keys(data.vars.resolved).length} vars / ${data.picks.length} picks / freq 扫描 ${scanCursor} 元素`);
      return data;
    },
    uninstall() {
      document.removeEventListener('click', onClick, true);
      delete window.__uikit;
      console.info('[uikit] 已卸载');
    }
  };
  console.info('[uikit] 已安装：Alt+点击打标 → __uikit.dump() 导出');
})();
