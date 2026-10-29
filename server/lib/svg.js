'use strict';
/** Generates the product artwork (gradient + confetti + emoji) as local SVG files. */
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const { escapeXml } = require('./helpers');

function safeGradient(gradient) {
  const parts = String(gradient || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^#[0-9a-fA-F]{3,8}$/.test(s));
  if (parts.length >= 2) return [parts[0], parts[1]];
  if (parts.length === 1) return [parts[0], '#D3FF52'];
  return ['#7C5CFF', '#D3FF52'];
}

function productSvg(product) {
  const [c1, c2] = safeGradient(product.gradient);
  const emoji = escapeXml(product.emoji || '🎁');
  const name = escapeXml(product.name || '');
  const rnd = mulberry(product.id || product.slug || name);
  const confetti = [];
  const palette = ['#FFFFFF', '#0B0B0F', '#FFD84D', '#FF6B5E'];
  for (let i = 0; i < 26; i++) {
    const x = Math.round(rnd() * 800);
    const y = Math.round(rnd() * 800);
    const rot = Math.round(rnd() * 360);
    const color = palette[Math.floor(rnd() * palette.length)];
    const opacity = (0.25 + rnd() * 0.5).toFixed(2);
    const kind = rnd();
    if (kind < 0.55) {
      confetti.push(`<rect x="${x}" y="${y}" width="14" height="7" rx="3.5" fill="${color}" opacity="${opacity}" transform="rotate(${rot} ${x} ${y})"/>`);
    } else {
      confetti.push(`<circle cx="${x}" cy="${y}" r="4.5" fill="${color}" opacity="${opacity}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img" aria-label="${name}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <pattern id="dots" width="34" height="34" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="2" fill="#FFFFFF" opacity="0.16"/>
    </pattern>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.55">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="800" fill="url(#g)"/>
  <rect width="800" height="800" fill="url(#dots)"/>
  <circle cx="640" cy="150" r="210" fill="#FFFFFF" opacity="0.12"/>
  <circle cx="130" cy="660" r="180" fill="#0B0B0F" opacity="0.08"/>
  ${confetti.join('\n  ')}
  <rect x="150" y="150" width="500" height="500" rx="120" fill="url(#glow)"/>
  <rect x="184" y="184" width="432" height="432" rx="110" fill="#FFFFFF" opacity="0.18"/>
  <text x="400" y="418" font-family="'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif" font-size="300" text-anchor="middle" dominant-baseline="central">${emoji}</text>
</svg>
`;
}

function mulberry(seedInput) {
  const text = String(seedInput);
  let a = 0;
  for (let i = 0; i < text.length; i++) a = (a * 31 + text.charCodeAt(i)) >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function writeProductImage(product) {
  try {
    fs.mkdirSync(config.dirs.images, { recursive: true });
    const file = path.join(config.dirs.images, `${product.slug}.svg`);
    fs.writeFileSync(file, productSvg(product), 'utf8');
    return `/assets/img/products/${product.slug}.svg`;
  } catch (err) {
    console.error('[images] failed to write product image:', err.message);
    return null;
  }
}

module.exports = { productSvg, writeProductImage, safeGradient };
