export interface JsonRpcIO {
  send: (data: unknown) => Promise<void>;
  addReceiveListener: (listener: (data: unknown) => void) => void;
  removeReceiveListener: (listener: (data: unknown) => void) => void;
}

export class JsonRpcSender<THandler extends JsonRpcHandler> {
  #io: JsonRpcIO;
  #nextRequestId = 0;

  constructor(io: JsonRpcIO) {
    this.#io = io;
  }

  async notify<TMethod extends keyof Notifyable<THandler>>(
    method: TMethod,
    params?: Params<THandler, TMethod>,
  ) {
    await this.#io.send({ "jsonrpc": "2.0", method, params });
  }

  async request<TMethod extends keyof Requestable<THandler>>(
    method: TMethod,
    params?: Params<THandler, TMethod>,
  ) {
    const id = this.#nextRequestId;
    this.#nextRequestId++;
    const response = new Promise((resolve, reject) => {
      // deno-lint-ignore no-explicit-any
      const listener = (data: any) => {
        if (data.jsonrpc == "2.0" && !("method" in data) && data.id == id) {
          this.#io.removeReceiveListener(listener);
          if ("result" in data) {
            resolve(data.result);
          } else if ("error" in data) {
            reject(data.error);
          } else {
            reject(null);
          }
        }
      };
      this.#io.addReceiveListener(listener);
    });
    this.#io.send({ jsonrpc: "2.0", id, method, params });
    return await response as Result<THandler, TMethod>;
  }
}

export class JsonRpcReceiver<THandler extends JsonRpcHandler> {
  #io: JsonRpcIO;
  #handler: THandler;

  constructor(io: JsonRpcIO, handler: THandler) {
    this.#io = io;
    this.#handler = handler;

    // deno-lint-ignore no-explicit-any
    this.#io.addReceiveListener(async (data: any) => {
      if (data.jsonrpc != "2.0") return;
      if (!("method" in data)) return;
      const { method, params, id } = data;
      const respond = async (result: unknown) => {
        await this.#io.send({ jsonrpc: "2.0", id, result });
      };
      const respondError = async (error: unknown) => {
        if (error instanceof Error) {
          await this.#io.send({
            jsonrpc: "2.0",
            id,
            error: { code: -32000, message: error.message, data: error },
          });
        } else {
          await this.#io.send({
            jsonrpc: "2.0",
            id,
            error: { code: -32099, message: "Unknown error", data: error },
          });
        }
      };
      if (method in this.#handler) {
        try {
          respond(await this.#handler[method](params));
        } catch (error) {
          respondError(error);
        }
      }
    });
  }
}

// deno-lint-ignore no-explicit-any
type JsonRpcHandler = Record<string, (params: any) => Promise<any> | void>;

type Notifyable<T extends JsonRpcHandler> = {
  // deno-lint-ignore no-explicit-any
  [Key in keyof T as ReturnType<T[Key]> extends Promise<any> ? never : Key]:
    T[Key];
};

type Requestable<T extends JsonRpcHandler> = {
  // deno-lint-ignore no-explicit-any
  [Key in keyof T as ReturnType<T[Key]> extends Promise<any> ? Key : never]:
    T[Key];
};

type Params<T extends JsonRpcHandler, U extends keyof T> = Parameters<T[U]>[0];
type Result<T extends JsonRpcHandler, U extends keyof T> = ReturnType<T[U]>;
