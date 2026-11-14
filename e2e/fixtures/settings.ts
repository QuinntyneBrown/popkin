import type { Page, Route } from '@playwright/test';
import { popkinId } from './chat';
import { type Home, maraAtHome } from './home';
import type { Hub } from './hub';
import { problem } from './stubs';

/**
 * Popkin settings (L2-020) answered in memory (ADR 0005): `PATCH /api/popkins/{id}` and
 * `PUT …/length` change the home's answer as the API's do, and refuse a member who is not the
 * Host. A spec can fail or hold either.
 */
export type SettingsCall = 'look' | 'length';

export interface Look {
  name: string;
  emoji: string;
  colour: string;
}

export interface Length {
  length: string;
  endsAt: string | null;
}

export class Settings {
  /** The bodies sent, in order. */
  readonly sent: { look: Look[]; length: Length[] } = { look: [], length: [] };
  private readonly failing = new Set<SettingsCall>();
  private readonly held = new Map<SettingsCall, Promise<void>>();

  constructor(
    private readonly page: Page,
    readonly home: Home,
  ) {}

  /** Installed after the home's, so these answer before it does. */
  async install(): Promise<void> {
    await this.page.route(`**/api/popkins/${popkinId}`, (route) =>
      route.request().method() === 'PATCH' ? this.answer(route, 'look') : route.fallback(),
    );
    await this.page.route(`**/api/popkins/${popkinId}/length`, (route) =>
      route.request().method() === 'PUT' ? this.answer(route, 'length') : route.fallback(),
    );
  }

  /** The call fails with a server error until `recover`. */
  fail(call: SettingsCall): void {
    this.failing.add(call);
  }

  recover(call: SettingsCall): void {
    this.failing.delete(call);
  }

  /** The call does not answer until the returned function is called. */
  hold(call: SettingsCall): () => void {
    let release: () => void = () => undefined;
    this.held.set(call, new Promise((resolve) => (release = resolve)));
    return release;
  }

  /** The Host changes the Popkin on another device: changed, and told over the hub. */
  async changedElsewhere(hub: Hub, change: Partial<Look & Length>): Promise<void> {
    this.apply(change);
    await hub.push('PopkinChanged', popkinId, this.dto());
  }

  private async answer(route: Route, call: SettingsCall): Promise<void> {
    const body = route.request().postDataJSON() as Look & Length;
    if (call === 'look') this.sent.look.push(body);
    else this.sent.length.push(body);
    await this.held.get(call);
    if (this.home.popkin.viewerRole !== 'Host') return this.refuse(route, 403, 'host_only');
    if (this.failing.has(call)) return this.refuse(route, 500, 'server_error');
    this.apply(
      call === 'look'
        ? { name: body.name, emoji: body.emoji, colour: body.colour }
        : { length: body.length, endsAt: body.endsAt },
    );
    return route.fulfill({ json: this.dto() });
  }

  private apply(change: Partial<Look & Length>): void {
    this.home.popkin = { ...this.home.popkin, ...change, version: this.home.popkin.version + 1 };
  }

  private dto() {
    const { id, name, emoji, colour, length, endsAt, version } = this.home.popkin;
    return { id, name, emoji, colour, length, endsAt, version };
  }

  private refuse(route: Route, status: number, code: string): Promise<void> {
    const answer = problem(status, code);
    return route.fulfill({ status: answer.status, json: answer.body });
  }
}

/** Mara, the Host of Lakeside Weekend, at its home, with its settings answering. */
export async function maraWithSettings(
  page: Page,
  change?: (home: Home) => void,
): Promise<Settings> {
  const home = await maraAtHome(page, change);
  const settings = new Settings(page, home);
  await settings.install();
  return settings;
}
