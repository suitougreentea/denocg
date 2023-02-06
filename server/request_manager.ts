import {
  RequestHandler,
  RequestName,
  RequestParams,
  TypeDefinition,
} from "../common/types.ts";
import { ServerClient } from "./client.ts";

export class RequestManager<TDef extends TypeDefinition> {
  #handlers: {
    [TKey in RequestName<TDef>]?: RequestHandler<TDef, TKey>;
  } = {};

  handleRequest<TKey extends RequestName<TDef>>(
    _client: ServerClient<TDef>,
    name: TKey,
    params: RequestParams<TDef, TKey>,
  ) {
    if (!(name in this.#handlers)) throw new Error("Handler not found");
    const result = this.#handlers[name]!(params);
    if (result instanceof Promise) return result;
    return Promise.resolve(result);
  }

  registerHandler<TKey extends RequestName<TDef>>(
    name: TKey,
    handler: RequestHandler<TDef, TKey>,
    overwrite: boolean,
  ) {
    if (name in this.#handlers && !overwrite) {
      throw new Error("Handler already registered");
    }
    this.#handlers[name] = handler;
  }

  unregisterHandler<TKey extends RequestName<TDef>>(
    name: TKey,
    handler: RequestHandler<TDef, TKey>,
  ) {
    if (this.#handlers[name] == handler) {
      delete this.#handlers[name];
    }
  }
}
