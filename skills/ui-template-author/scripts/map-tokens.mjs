#!/usr/bin/env node
/*
 * map-tokens — 实测颜色 → oklch 换算 + 契约口径对比度（与 validate_package.py 完全同口径）
 *
 * 为什么存在：theme.css 的 T04 只认 oklch()；真实页面 computed style 常给 lch()/hex/rgb()。
 * 三个坑（都踩过，勿再踩）：
 *   1. CSS lch() 是 CIE Lab/D50，oklch 是 OKLab/D65——必须走 Bradford 适配（方向 D50→D65，
 *      矩阵见下，与 Lindbloom 发表值一致；写反会整体偏色）。
 *   2. OKLab 的 M1/M2 矩阵不要凭记忆写（本项目错 3 次）：下方取自 Ottosson 原始系数。
 *   3. 校验器对比度在**线性 sRGB 空间直接加权**（无 WCAG gamma 编码往返），tint 对在
 *      **gamma 编码空间**合成——本工具与它逐位一致，自算其他口径会得出错误结论。
 *
 * 用法：
 *   node map-tokens.mjs lch 94.44 0.5 282      # L%(0-100) C H → oklch + hex
 *   node map-tokens.mjs hex '#efeff0'          # → oklch（+ 往返校验）
 *   node map-tokens.mjs oklch 0.952 0.001 285.4 # → hex
 *   node map-tokens.mjs contrast 'oklch(0.945 0.003 286.32)' 'oklch(0.988 0 0)'
 *                                               # 线性空间对比度（C01 口径）
 *   node map-tokens.mjs tint 'oklch(0.515 0.245 27.325)' 0.1 '#ffffff'
 *                                               # 文字压自家 alpha tint 的对比度（C02 口径）
 *   node map-tokens.mjs selftest                # 锚点往返自检
 *
 * 契约全对（contrast 19 对 + tints 表）在 contract/tokens.json；换算后务必跑
 * validate_package.py package <dir> 做终验。
 */
const M = {
  bradfordD50toD65: [
    [0.9555766, -0.0230393, 0.0631636],
    [-0.0282895, 1.0099416, 0.0210077],
    [0.0122982, -0.020483, 1.3299098],
  ],
  xyzToLinearSrgb: [
    [3.2409699419, -1.5373831776, -0.4986107603],
    [-0.9692436363, 1.8759675018, 0.0415550574],
    [0.0556300797, -0.2039769591, 1.0569715082],
  ],
  linearSrgbToXyz: [
    [0.4123907993, 0.3575843394, 0.1804807884],
    [0.2126390059, 0.7151686788, 0.0721923154],
    [0.0193308187, 0.1191947798, 0.9505321522],
  ],
  xyzToLms: [
    [0.8190180096, 0.361867369, -0.1288723057],
    [0.0329836586, 0.9292864997, 0.0361451238],
    [0.0481771626, 0.2642395747, 0.6335916474],
  ],
  lmsToXyz: [
    [1.2270138511, -0.5577179795, 0.2811925028],
    [-0.0405807226, 1.1122568696, -0.0716769199],
    [-0.0763848983, -0.4214819754, 1.5868641036],
  ],
  oklabFromLms: {
    L: [0.2104542553, 0.793617785, -0.0040720468],
    a: [1.9779984951, -2.428592205, 0.4505937099],
    b: [0.0259040371, 0.7827717662, -0.808675766],
  },
  lmsFromOklab: [
    [1, 0.3963377774, 0.2158037573],
    [1, -0.1055613458, -0.0638541728],
    [1, -0.0894841775, -1.291485548],
  ],
};
const D50 = [0.9642956764, 1.0, 0.8251796016];
const mul = (m, v) => m.map((r) => r.reduce((s, x, j) => s + x * v[j], 0));
const dot = (c, v) => c.reduce((s, x, j) => s + x * v[j], 0);
const hueOf = (a, b) => ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;

// lch(L% 0-100, C, H) → oklch [0-1, C, H]
function lchToOklch(Lpct, C, H) {
  const rad = (H * Math.PI) / 180;
  const fy = (Lpct + 16) / 116, fx = fy + (C * Math.cos(rad)) / 500, fz = fy - (C * Math.sin(rad)) / 200;
  const e = 216 / 24389, k = 24389 / 27;
  const g = (x) => (x ** 3 > e ? x ** 3 : (116 * x - 16) / k);
  const xyz50 = [g(fx) * D50[0], g(fy) * D50[1], g(fz) * D50[2]];
  const lin = mul(M.xyzToLinearSrgb, mul(M.bradfordD50toD65, xyz50)).map((v) => Math.min(1, Math.max(0, v)));
  return linToOklch(lin);
}
function linToOklch(lin) {
  const lms = mul(M.xyzToLms, mul(M.linearSrgbToXyz, lin)).map(Math.cbrt);
  const L = dot(M.oklabFromLms.L, lms), a = dot(M.oklabFromLms.a, lms), b = dot(M.oklabFromLms.b, lms);
  return [L, Math.hypot(a, b), hueOf(a, b)];
}
function hexToLin(hex) {
  return [0, 1, 2].map((i) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
}
const oklchToLin = ([L, C, H]) => {
  const rad = (H * Math.PI) / 180;
  const lab = [L, C * Math.cos(rad), C * Math.sin(rad)];
  const lms = mul(M.lmsFromOklab, lab).map((v) => v ** 3);
  // 与校验器 oklch_to_srgb 一致：线性通道裁剪到 [0,1]（高饱和色会有负通道）
  return mul(M.xyzToLinearSrgb, mul(M.lmsToXyz, lms)).map((v) => Math.min(1, Math.max(0, v)));
};
const enc = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const toHex = (lin) =>
  "#" + lin.map((v) => Math.round(Math.min(1, Math.max(0, enc(v))) * 255).toString(16).padStart(2, "0")).join("");

// —— 校验器口径（validate_package.py：线性空间加权，无 gamma 往返）——
const lum = (lin) => 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// tint 合成在 gamma 编码空间，比对比度前先解码回线性（同 validate_package.py tint()）
const dec = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const tintContrast = (fgLin, underLin, alpha) => {
  const mixed = [0, 1, 2].map((i) => dec(alpha * enc(fgLin[i]) + (1 - alpha) * enc(underLin[i])));
  return contrast(fgLin, mixed);
};

const fmt = ([L, C, H]) => `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
const parseOklch = (s) => {
  const m = s.match(/oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/);
  if (!m) throw new Error(`无法解析 oklch: ${s}`);
  return [parseFloat(m[1]) / (s.includes("%") ? 100 : 1), parseFloat(m[2]), parseFloat(m[3])];
};

const [cmd, ...args] = process.argv.slice(2);
switch (cmd) {
  case "lch": {
    const ok = lchToOklch(+args[0], +args[1], +args[2]);
    console.log(`lch(${args[0]} ${args[1]} ${args[2]}) → ${fmt(ok)}  hex=${toHex(oklchToLin(ok))}`);
    break;
  }
  case "hex": {
    const ok = linToOklch(hexToLin(args[0]));
    const back = toHex(oklchToLin(ok));
    console.log(`${args[0]} → ${fmt(ok)}  往返=${back}${back.toLowerCase() === args[0].toLowerCase() ? " ✓" : " (近似)"}`);
    break;
  }
  case "oklch": {
    const ok = parseOklch(args.join(" "));
    console.log(`${fmt(ok)} → hex=${toHex(oklchToLin(ok))}`);
    break;
  }
  case "contrast": {
    const [a, b] = [parseOklch(args[0]), parseOklch(args[1])];
    console.log(`${fmt(a)} vs ${fmt(b)} = ${contrast(oklchToLin(a), oklchToLin(b)).toFixed(3)}（线性空间，C01 口径）`);
    break;
  }
  case "tint": {
    const fg = parseOklch(args[0]), alpha = +args[1];
    const underLin = args[2]?.startsWith("#") ? hexToLin(args[2]) : oklchToLin(parseOklch(args[2] ?? "oklch(1 0 0)"));
    console.log(`${fmt(fg)} 压自家 ${alpha * 100}% tint = ${tintContrast(oklchToLin(fg), underLin, alpha).toFixed(3)}（gamma 合成，C02 口径）`);
    break;
  }
  case "selftest": {
    const anchors = ["#efeff0", "#f9f9fa", "#e2e2e2", "#5e6ad2", "#ffffff", "#0a0a0a"];
    let ok = true;
    for (const h of anchors) {
      const back = toHex(oklchToLin(linToOklch(hexToLin(h))));
      const pass = back.toLowerCase() === h.toLowerCase();
      if (!pass) ok = false;
      console.log(`${h} → ${fmt(linToOklch(hexToLin(h)))} → ${back} ${pass ? "✓" : "✗"}`);
    }
    console.log(ok ? "selftest: 全部往返一致" : "selftest: FAILED");
    process.exit(ok ? 0 : 1);
  }
  default:
    console.log("用法见文件头注释：lch | hex | oklch | contrast | tint | selftest");
}
