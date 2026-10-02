import qrcode from 'qrcode-generator';
import type { WifiSecurity } from '../api/types';

/** Escapes the characters with special meaning in the WIFI: URI format. */
function escape(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

/** Payload phones understand when scanning a WLAN QR code (Android & iOS camera apps). */
export function wifiPayload(ssid: string, password: string | null, security: WifiSecurity, hidden = false): string {
  const type = security === 'OPEN' ? 'nopass' : 'WPA';
  let out = `WIFI:T:${type};S:${escape(ssid)};`;
  if (security !== 'OPEN' && password) out += `P:${escape(password)};`;
  if (hidden) out += 'H:true;';
  return out + ';';
}

/** QR modules (true = dark) for the given text, UTF-8 encoded. */
export function qrMatrix(text: string): boolean[][] {
  // qrcode-generator takes one byte per char, so pass the UTF-8 bytes as a binary string.
  const binary = Array.from(new TextEncoder().encode(text), (b) => String.fromCharCode(b)).join('');
  const qr = qrcode(0, 'M');
  qr.addData(binary, 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

/** SVG path ("M x y h1 v1 h-1 z" per dark module) for a matrix, with a quiet zone of `margin` modules. */
export function qrPath(matrix: boolean[][], margin = 2): string {
  const parts: string[] = [];
  matrix.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (dark) parts.push(`M${c + margin} ${r + margin}h1v1h-1z`);
    }),
  );
  return parts.join('');
}

/** Renders a printable PNG (QR + optional caption lines) and triggers a download. */
export function downloadQrPng(text: string, fileName: string, caption: string[] = []) {
  const matrix = qrMatrix(text);
  const cell = 24;
  const margin = 4;
  const size = (matrix.length + margin * 2) * cell;
  const lineHeight = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size + caption.length * lineHeight + (caption.length ? 40 : 0);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#07070B';
  matrix.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (dark) ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
    }),
  );
  ctx.textAlign = 'center';
  caption.forEach((line, i) => {
    ctx.font = i === 0 ? 'bold 44px "IBM Plex Sans", sans-serif' : '40px "JetBrains Mono", monospace';
    ctx.fillText(line, size / 2, size + (i + 1) * lineHeight - 8);
  });
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = fileName;
  a.click();
}
