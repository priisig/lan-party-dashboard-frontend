import { useMemo } from 'react';
import { qrMatrix, qrPath } from '../lib/wifiQr';

/** QR code as crisp, scalable SVG on a white tile (cameras need the light quiet zone). */
export function QrCode({ text, label, className }: { text: string; label: string; className?: string }) {
  const matrix = useMemo(() => qrMatrix(text), [text]);
  const size = matrix.length + 4;
  return (
    <figure className={'qr' + (className ? ' ' + className : '')}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges">
        <rect width={size} height={size} fill="#fff" />
        <path d={qrPath(matrix)} fill="#07070B" />
      </svg>
    </figure>
  );
}
