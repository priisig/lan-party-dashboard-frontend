import { applyAccent, parseAccent, stripAccent } from './accent';

describe('accent markup', () => {
  it('splits coloured words from plain text', () => {
    expect(parseAccent('Willkommen an der {lila:LAN}.')).toEqual([
      { text: 'Willkommen an der ', color: null },
      { text: 'LAN', color: 'lila' },
      { text: '.', color: null },
    ]);
  });

  it('keeps unknown colours and broken markup as plain text', () => {
    expect(stripAccent('{pink:LAN} {lila:offen')).toBe('{pink:LAN} {lila:offen');
    expect(parseAccent('<b>{blau:x}</b>')).toEqual([
      { text: '<b>', color: null },
      { text: 'x', color: 'blau' },
      { text: '</b>', color: null },
    ]);
  });

  it('wraps and unwraps a selection', () => {
    const v = 'Rechner einstecken.';
    const coloured = applyAccent(v, 0, 7, 'blau');
    expect(coloured).toBe('{blau:Rechner} einstecken.');
    expect(applyAccent(coloured, 3, 6, 'gruen')).toBe('{gruen:Rechner} einstecken.');
    expect(applyAccent(coloured, 0, coloured.length, null)).toBe('Rechner einstecken.');
  });
});
