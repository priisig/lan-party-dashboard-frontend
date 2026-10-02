import type { IconName } from '../components/Icon';

/** Public views; the keys are what admins list in "Kiosk-Ansichten". */
export const VIEWS: { key: string; path: string; label: string; short: string; icon: IconName }[] = [
  { key: 'overview', path: '/', label: 'Übersicht', short: 'Übersicht', icon: 'home' },
  { key: 'tournaments', path: '/turniere', label: 'Turniere', short: 'Turniere', icon: 'trophy' },
  { key: 'seating', path: '/sitzplan', label: 'Sitzplan', short: 'Sitzplan', icon: 'seat' },
  { key: 'stats', path: '/stats', label: 'Nerd Stats', short: 'Stats', icon: 'chart' },
];

/** Header navigation: the views plus anchors into the overview page. */
export const NAV_LINKS: { to: string; label: string }[] = [
  { to: '/', label: 'Übersicht' },
  { to: '/#programm', label: 'Programm' },
  { to: '/turniere', label: 'Turniere' },
  { to: '/sitzplan', label: 'Sitzplan' },
  { to: '/#netzwerk', label: 'Netzwerk' },
  { to: '/stats', label: 'Nerd Stats' },
];
