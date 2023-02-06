export class Socket extends EventTarget {
  #address: string;
  #ws: WebSocket | null = null;
  opened = false;
  #lastConnectionAttemptTime = -1;

  constructor(address: string) {
    super();
    this.#address = address;
  }

  #createWebSocket() {
    console.log("Creating WebSocket");
    this.#lastConnectionAttemptTime = performance.now();
    this.#ws = new WebSocket(this.#address);

    this.#ws.addEventListener("open", (_) => {
      console.log("WebSocket opened");
      this.dispatchEvent(new Event("open"));
    });

    this.#ws.addEventListener("close", (ev) => {
      console.log("WebSocket closed: ", ev);
      this.#ws = null;
      if (!this.opened) return;

      // reconnection
      setTimeout(
        () => this.#createWebSocket(),
        Math.max(
          5000 - (performance.now() - this.#lastConnectionAttemptTime),
          0,
        ),
      );
    });

    this.#ws.addEventListener("message", (ev) => {
      try {
        const parsed = JSON.parse(ev.data);
        this.dispatchEvent(new MessageEvent("message", { data: parsed }));
      } catch (_) {
        console.warn("Unsupported data received: ", ev.data);
      }
    });
  }

  #disposeWebSocket() {
    this.#ws?.close();
  }

  open() {
    this.opened = true;
    this.#createWebSocket();
  }

  close() {
    this.opened = false;
    this.#disposeWebSocket();
  }

  isConnected() {
    if (this.#ws == null) return false;
    return this.#ws.readyState == WebSocket.OPEN;
  }

  waitForConnection() {
    if (!this.opened) return Promise.reject();
    if (this.isConnected()) return Promise.resolve();
    return new Promise<void>((resolve, _) => {
      const listener = () => {
        this.removeEventListener("open", listener);
        resolve();
      };
      this.addEventListener("open", listener);
    });
  }

  send(data: unknown) {
    if (!this.isConnected()) throw new Error();
    this.#ws!.send(JSON.stringify(data));
  }
}

interface SocketEventMap {
  message: MessageEvent;
  open: Event;
}

export interface Socket {
  addEventListener<K extends keyof SocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: SocketEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof SocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: SocketEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
}
