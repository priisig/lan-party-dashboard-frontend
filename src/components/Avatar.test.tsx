import { initials } from './Avatar';

it('builds initials and never throws on missing names', () => {
  expect(initials('Nyx')).toBe('NY');
  expect(initials('Pixel Panther')).toBe('PP');
  expect(initials(undefined)).toBe('?');
  expect(initials('  ')).toBe('?');
});
