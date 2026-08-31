const opentype = require('opentype.js');
const fs = require('fs');

const font = opentype.parse(fs.readFileSync('fonts/ttf/JetBrainsMono-Medium.ttf').buffer);

// Layout: 24-unit mark on the left, text cap height ~2/3 of it, optically centered.
const MARK = 24, GAP = 8, FONT_SIZE = 22;
const upm = font.unitsPerEm;
const capH = ((font.tables.os2.sCapHeight || 730) / upm) * FONT_SIZE;
const baseline = MARK / 2 + capH / 2;

const x0 = MARK + GAP;
const left = 'webmcp', right = 'stack';
const p1 = font.getPath(left, x0, baseline, FONT_SIZE, { kerning: true });
const w1 = font.getAdvanceWidth(left, FONT_SIZE, { kerning: true });
const p2 = font.getPath(right, x0 + w1, baseline, FONT_SIZE, { kerning: true });
const w2 = font.getAdvanceWidth(right, FONT_SIZE, { kerning: true });

const width = Math.ceil(x0 + w1 + w2);

const ACCENT = '#58a6ff';
const mark = (stroke) => `
  <path d="M12 2.5 L21 7 L12 11.5 L3 7 Z" fill="${ACCENT}"/>
  <path d="M3 12 L12 16.5 L21 12" fill="none" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M3 16.5 L12 21 L21 16.5" fill="none" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>`;

function wordmark(ink, stroke) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${MARK}" fill="none">
${mark(stroke)}
  <path d="${p1.toPathData(2)}" fill="${ink}"/>
  <path d="${p2.toPathData(2)}" fill="${ACCENT}"/>
</svg>
`;
}

fs.writeFileSync('brand/wordmark-light-on-dark.svg', wordmark('#e9ecf2', '#e9ecf2'));
fs.writeFileSync('brand/wordmark-dark-on-light.svg', wordmark('#0a0b0f', '#0a0b0f'));
console.log('wordmarks written, viewBox width', width);
