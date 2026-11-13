import type { Page, WebSocketRoute } from '@playwright/test';

/** SignalR's JSON protocol ends every frame with this record separator. */
const END = '\u001e';
const HUB_PATH = '/hubs/popkin';

/** The hub of each page, for the steps that reach a screen state with the page alone. */
const hubs = new WeakMap<Page, Hub>();

export function hubOf(page: Page): Hub {
  const hub = hubs.get(page);
  if (!hub) throw new Error('This page has no hub stub.');
  return hub;
}

interface Frame {
  type?: number;
  target?: string;
  arguments?: unknown[];
  invocationId?: string;
  protocol?: string;
}

/**
 * ADR 0010: the hub every page talks to. No test opens a connection to a real hub: this answers
 * the negotiate request, routes the hub's WebSocket, completes the SignalR JSON handshake,
 * answers pings and records what the app invokes. A spec pushes an event by its name; specs
 * and page objects never write protocol frames themselves.
 */
export class Hub {
  /** What the app invoked on the hub, in order. */
  readonly invoked: { target: string; arguments: unknown[] }[] = [];
  /** How many connections the app has opened so far. */
  connections = 0;

  private readonly handlers = new Map<string, (args: unknown[]) => void>();
  private socket?: WebSocketRoute;
  private ready: Promise<void>;
  private markReady: () => void = () => undefined;

  constructor() {
    this.ready = new Promise((resolve) => (this.markReady = resolve));
  }

  /** Installed for every page by the `page` fixture; anything else under /hubs is unanswered. */
  async install(page: Page, unanswered: string[]): Promise<void> {
    hubs.set(page, this);
    await page.route('**/hubs/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === 'POST' && url.pathname === `${HUB_PATH}/negotiate`) {
        await route.fulfill({
          json: {
            negotiateVersion: 1,
            connectionId: 'e2e-connection',
            connectionToken: 'e2e-token',
            availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text'] }],
          },
        });
        return;
      }
      unanswered.push(`${request.method()} ${url.pathname}`);
      await route.abort();
    });

    await page.routeWebSocket(/\/hubs\//, (socket) => {
      const url = new URL(socket.url());
      if (url.pathname !== HUB_PATH) {
        unanswered.push(`WS ${url.pathname}`);
        void socket.close();
        return;
      }
      this.connections++;
      this.socket = socket;
      socket.onMessage((data) => {
        for (const text of String(data).split(END).filter(Boolean)) {
          this.receive(socket, JSON.parse(text) as Frame);
        }
      });
    });
  }

  /** Resolves once the app has connected and completed the handshake. */
  connected(): Promise<void> {
    return this.ready;
  }

  /** Sends the app an event, as the server would: its name and its arguments. */
  async push(event: string, ...args: unknown[]): Promise<void> {
    await this.ready;
    this.socket?.send(JSON.stringify({ type: 1, target: event, arguments: args }) + END);
  }

  /** Has a fixture act on what the app invokes, as the server would: relay a signal, say. */
  onInvoke(target: string, handler: (args: unknown[]) => void): void {
    this.handlers.set(target, handler);
  }

  /** Drops the connection, as a tunnel does; the app reconnects by itself. */
  async drop(): Promise<void> {
    await this.ready;
    const socket = this.socket;
    this.socket = undefined;
    this.ready = new Promise((resolve) => (this.markReady = resolve));
    await socket?.close({ code: 1006 });
  }

  private receive(socket: WebSocketRoute, frame: Frame): void {
    if (frame.protocol) {
      // The handshake: the app names the protocol and the server accepts it.
      socket.send('{}' + END);
      this.markReady();
    } else if (frame.type === 6) {
      socket.send(JSON.stringify({ type: 6 }) + END);
    } else if (frame.type === 1 && frame.target) {
      this.invoked.push({ target: frame.target, arguments: frame.arguments ?? [] });
      if (frame.invocationId) {
        socket.send(JSON.stringify({ type: 3, invocationId: frame.invocationId }) + END);
      }
      this.handlers.get(frame.target)?.(frame.arguments ?? []);
    }
  }
}
