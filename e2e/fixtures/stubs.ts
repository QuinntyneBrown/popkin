import type { Page, Route } from '@playwright/test';
import responses from './api/responses.json';

/**
 * States the recording cannot produce (ADR 0005): failures, refusals and requests held in
 * flight. Each stub answers one "METHOD /api/path" over the recording for the rest of the test.
 */
export type ApiKey = keyof typeof responses | (string & {});

interface Answer {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

function matches(route: Route, key: ApiKey): boolean {
  const request = route.request();
  const url = new URL(request.url());
  const [method, path] = key.split(' ');
  return request.method() === method && `${url.pathname}${url.search}` === path;
}

/** Answers `key` with `answer` instead of the recording. */
export async function answer(page: Page, key: ApiKey, value: Answer): Promise<void> {
  await page.route('**/api/**', async (route) => {
    if (!matches(route, key)) return route.fallback();
    await route.fulfill({ status: value.status, json: value.body, headers: value.headers });
  });
}

/** A ProblemDetails refusal with its `code`, as the API answers one. */
export function problem(
  status: number,
  code: string,
  extensions: Record<string, unknown> = {},
): Answer {
  const headers: Record<string, string> = { 'content-type': 'application/problem+json' };
  if (typeof extensions['retryAfterSeconds'] === 'number') {
    headers['retry-after'] = String(extensions['retryAfterSeconds']);
  }
  return { status, body: { status, title: code, code, ...extensions }, headers };
}

/** Makes `key` fail as the network does, with no answer at all. */
export async function failNetwork(page: Page, key: ApiKey): Promise<void> {
  await page.route('**/api/**', async (route) => {
    if (!matches(route, key)) return route.fallback();
    await route.abort('internetdisconnected');
  });
}

/**
 * Holds `key` in flight until the returned function is called, then answers it from the
 * recording, so a test can look at the busy state.
 */
export async function hold(page: Page, key: ApiKey): Promise<() => void> {
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/api/**', async (route) => {
    if (!matches(route, key)) return route.fallback();
    await released;
    await route.fallback();
  });
  return release;
}
