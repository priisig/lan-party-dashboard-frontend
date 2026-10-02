import { tierFor } from './useLayoutTier';

describe('tierFor', () => {
  it('picks the layout tier by width', () => {
    expect(tierFor(390, false)).toBe('mobile');
    expect(tierFor(1366, false)).toBe('laptop');
    expect(tierFor(1920, false)).toBe('wall');
    expect(tierFor(3840, false)).toBe('wall');
  });

  it('kiosk mode always uses the wall layout', () => {
    expect(tierFor(1280, true)).toBe('wall');
  });
});
