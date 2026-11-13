/**
 * The icon set the mocks draw (docs/design-system/foundations/iconography.html): 24 px outline
 * glyphs, stroked with currentColor. Each icon is a list of SVG shapes.
 */
export type IconShape =
  | { path: string }
  | { circle: [cx: number, cy: number, r: number] }
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
} satisfies Record<string, IconShape[]>;

export type IconName = keyof typeof ICONS;
