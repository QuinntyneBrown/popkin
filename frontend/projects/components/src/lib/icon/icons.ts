/**
 * The icon set the mocks draw (docs/design-system/foundations/iconography.html): 24 px outline
 * glyphs, stroked with currentColor. Each icon is a list of SVG shapes.
 */
export type IconShape =
  | { path: string }
  | { circle: [cx: number, cy: number, r: number]; fill?: boolean }
  | { line: [x1: number, x2: number, y1: number, y2: number] }
  | { rect: [width: number, height: number, x: number, y: number, rx: number] };

export const ICONS = {
  back: [{ path: 'm15 18-6-6 6-6' }],
  close: [{ path: 'M18 6 6 18' }, { path: 'm6 6 12 12' }],
  alert: [{ circle: [12, 12, 10] }, { line: [12, 12, 8, 12] }, { line: [12, 12.01, 16, 16] }],
  'not-found': [
    { path: 'm13.5 8.5-5 5' },
    { path: 'm8.5 8.5 5 5' },
    { circle: [11, 11, 8] },
    { path: 'm21 21-4.3-4.3' },
  ],
  'server-error': [
    { path: 'M12 12v4' },
    { path: 'M12 20h.01' },
    { path: 'M8.128 16.949A7 7 0 1 1 15.71 8h1.79a1 1 0 0 1 0 9h-1.642' },
  ],
  offline: [
    { path: 'M10.94 5.274A7 7 0 0 1 15.71 10h1.79a4.5 4.5 0 0 1 4.222 6.057' },
    { path: 'M18.796 18.81A4.5 4.5 0 0 1 17.5 19H9A7 7 0 0 1 5.79 5.78' },
    { path: 'm2 2 20 20' },
  ],
  camera: [
    {
      path: 'M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z',
    },
    { circle: [12, 13, 3] },
  ],
  photos: [
    { path: 'm22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16' },
    { path: 'M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2' },
    { circle: [13, 7, 1], fill: true },
    { rect: [14, 14, 8, 2, 2] },
  ],
  retry: [
    { path: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' },
    { path: 'M21 3v5h-5' },
    { path: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' },
    { path: 'M8 16H3v5' },
  ],
  copy: [
    { rect: [14, 14, 8, 8, 2] },
    { path: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' },
  ],
  check: [{ path: 'M20 6 9 17l-5-5' }],
  'check-circle': [{ circle: [12, 12, 10] }, { path: 'm9 12 2 2 4-4' }],
  message: [
    {
      path: 'M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719',
    },
  ],
  share: [
    { path: 'M12 2v13' },
    { path: 'm16 6-4-4-4 4' },
    { path: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8' },
  ],
  calendar: [
    { path: 'M8 2v4' },
    { path: 'M16 2v4' },
    { rect: [18, 18, 3, 4, 2] },
    { path: 'M3 10h18' },
    { path: 'M8 14h.01' },
    { path: 'M12 14h.01' },
    { path: 'M16 14h.01' },
    { path: 'M8 18h.01' },
    { path: 'M12 18h.01' },
    { path: 'M16 18h.01' },
  ],
  send: [
    {
      path: 'M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z',
    },
    { path: 'M6 12h16' },
  ],
  'wifi-off': [
    { path: 'M12 20h.01' },
    { path: 'M8.5 16.429a5 5 0 0 1 7 0' },
    { path: 'M5 12.859a10 10 0 0 1 5.17-2.69' },
    { path: 'M19 12.859a10 10 0 0 0-2.007-1.523' },
    { path: 'M2 8.82a15 15 0 0 1 4.177-2.643' },
    { path: 'M22 8.82a15 15 0 0 0-11.288-3.764' },
    { path: 'm2 2 20 20' },
  ],
  wifi: [
    { path: 'M12 20h.01' },
    { path: 'M2 8.82a15 15 0 0 1 20 0' },
    { path: 'M5 12.859a10 10 0 0 1 14 0' },
    { path: 'M8.5 16.429a5 5 0 0 1 7 0' },
  ],
  clock: [{ circle: [12, 12, 10] }, { path: 'M12 6v6l4 2' }],
  video: [
    { path: 'm16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5' },
    { rect: [14, 12, 2, 6, 2] },
  ],
  home: [
    { path: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' },
    {
      path: 'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    },
  ],
  experiences: [
    {
      path: 'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z',
    },
    { path: 'M20 2v4' },
    { path: 'M22 4h-4' },
    { circle: [4, 20, 2] },
  ],
  /* Drawn by no mock: the back chevron turned to point down, for the "New messages" control. */
  'chevron-down': [{ path: 'm6 9 6 6 6-6' }],
  'chevron-right': [{ path: 'm9 18 6-6-6-6' }],
  more: [{ circle: [12, 12, 1] }, { circle: [19, 12, 1] }, { circle: [5, 12, 1] }],
  plus: [{ path: 'M5 12h14' }, { path: 'M12 5v14' }],
  qr: [
    { rect: [5, 5, 3, 3, 1] },
    { rect: [5, 5, 16, 3, 1] },
    { rect: [5, 5, 3, 16, 1] },
    { path: 'M21 16h-3a2 2 0 0 0-2 2v3' },
    { path: 'M21 21v.01' },
    { path: 'M12 7v3a2 2 0 0 1-2 2H7' },
    { path: 'M3 12h.01' },
    { path: 'M12 3h.01' },
    { path: 'M12 16v.01' },
    { path: 'M16 12h1' },
    { path: 'M21 12v.01' },
    { path: 'M12 21v-1' },
  ],
  star: [
    {
      path: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z',
    },
  ],
} satisfies Record<string, IconShape[]>;

export type IconName = keyof typeof ICONS;
