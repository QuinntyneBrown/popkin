import { type Page, type WebSocketRoute, expect } from '@playwright/test';

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

declare global {
  interface Window {
    /** How many requests to the API the app has sent and not yet handled the answer to. */
    pkReadsOpen: number;
    /** How many requests to the API the app has sent in all. */
    pkReadsSent: number;
  }
}

/**
 * Counts the API requests the app has open. Angular's HttpClient sends over XMLHttpRequest and
 * handles an answer in its `load` listener; `loadend` follows in the same task, so a request
 * counts as open until the app has done all it does with its answer, not only until the answer
 * reached the page.
 */
function countOpenReads(): void {
  window.pkReadsOpen = 0;
  window.pkReadsSent = 0;
  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body) {
    window.pkReadsOpen++;
    window.pkReadsSent++;
    this.addEventListener('loadend', () => window.pkReadsOpen--, { once: true });
    return send.call(this, body);
  };
}

interface Frame {
  type?: number;
  target?: string;
  arguments?: unknown[];
  invocationId?: string;
  protocol?: string;
}

/** A frame the app sent, or undefined when it is not JSON; the caller fails the test naming it. */
function parsed(text: string): Frame | undefined {
  try {
    return JSON.parse(text) as Frame;
  } catch {
    return undefined;
  }
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
  /** How many of them the app has closed itself, as when a session ends. */
  closed = 0;

  private readonly handlers = new Map<string, (args: unknown[]) => void>();
  private page?: Page;
  private socket?: WebSocketRoute;
  private ready: Promise<void>;
  private markReady: () => void = () => undefined;

  constructor() {
    this.ready = new Promise((resolve) => (this.markReady = resolve));
  }

  /** Installed for every page by the `page` fixture; anything else under /hubs is unanswered. */
  async install(page: Page, unanswered: string[]): Promise<void> {
    hubs.set(page, this);
    this.page = page;
    await page.addInitScript(countOpenReads);
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
      socket.onClose(() => this.closed++);
      socket.onMessage((data) => {
        for (const text of String(data).split(END).filter(Boolean)) {
          const frame = parsed(text);
          if (frame) this.receive(socket, frame);
          else
            unanswered.push(
              `WS frame that is not JSON (${text.length} chars): ${text.slice(0, 120)}`,
            );
        }
      });
    });
  }

  /**
   * Resolves once the app has connected and completed the handshake: the client pings the hub
   * as the last step of starting, so the first ping after the handshake says the app's own
   * `start()` has finished and the screens have asked for what they read again on connecting.
   */
  connected(): Promise<void> {
    return this.ready;
  }

  /**
   * Resolves once the app has connected and has handled the answer to every request it made by
   * then: the screens read again what they show once the hub has connected (the shared real-time
   * rules), and an answer computed before a change would otherwise land after the event that
   * pushed the change and put back what it replaced. A change pushed after this proves the event,
   * not a read, brought it.
   */
  async caughtUp(): Promise<void> {
    await this.ready;
    const page = this.page;
    if (!page) throw new Error('This hub has no page.');
    // A screen asks for what it shows when it renders, a frame after the answer that rendered it:
    // the app is caught up once no request is open and none is sent across a frame and a task.
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const sent = window.pkReadsSent;
            await new Promise<void>((settled) => requestAnimationFrame(() => setTimeout(settled)));
            return window.pkReadsOpen === 0 && window.pkReadsSent === sent;
          }),
        { message: 'The app still had API requests open, or sent more, once the hub connected' },
      )
      .toBe(true);
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
    } else if (frame.type === 6) {
      socket.send(JSON.stringify({ type: 6 }) + END);
      // The first ping of a connection ends the client's start (see `connected`).
      if (socket === this.socket) this.markReady();
    } else if (frame.type === 1 && frame.target) {
      this.invoked.push({ target: frame.target, arguments: frame.arguments ?? [] });
      if (frame.invocationId) {
        socket.send(JSON.stringify({ type: 3, invocationId: frame.invocationId }) + END);
      }
      this.handlers.get(frame.target)?.(frame.arguments ?? []);
    }
  }
}
