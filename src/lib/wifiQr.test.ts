import { qrMatrix, wifiPayload } from './wifiQr';

describe('wifiPayload', () => {
  it('builds the WIFI: URI and escapes special characters', () => {
    expect(wifiPayload('LAN;Party', 'pa:ss"w,rd\\', 'WPA')).toBe('WIFI:T:WPA;S:LAN\\;Party;P:pa\\:ss\\"w\\,rd\\\\;;');
  });

  it('uses nopass for open networks and flags hidden ones', () => {
    expect(wifiPayload('Gast', 'ignored', 'OPEN', true)).toBe('WIFI:T:nopass;S:Gast;H:true;;');
  });

  it('treats WPA3 like WPA (phones negotiate the version)', () => {
    expect(wifiPayload('X', '12345678', 'WPA3')).toBe('WIFI:T:WPA;S:X;P:12345678;;');
  });
});

describe('qrMatrix', () => {
  it('produces a square matrix with finder patterns, also for non-ASCII text', () => {
    const m = qrMatrix(wifiPayload('Zürich-LAN', 'geheim123', 'WPA'));
    expect(m.length).toBeGreaterThanOrEqual(21);
    expect(m.every((row) => row.length === m.length)).toBe(true);
    // top-left finder pattern: dark border, light ring, dark center
    expect(m[0][0] && m[0][6] && m[6][0]).toBe(true);
    expect(m[1][1]).toBe(false);
    expect(m[3][3]).toBe(true);
  });
});
