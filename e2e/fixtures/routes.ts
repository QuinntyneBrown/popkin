/**
 * Every screen state the suite opens, keyed once so one spec serves both targets: the Angular
 * app (`app` path) and the design reference (`mock` file under docs/mocks, opened when
 * PK_BASELINE=1). `mock` is absent until the screen has one.
 */
export interface ScreenRoute {
  app: string;
  mock?: string;
}

export const routes = {
  home: { app: '/' },
} satisfies Record<string, ScreenRoute>;

export type RouteKey = keyof typeof routes;
