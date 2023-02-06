import {
  RequestName,
  RequestParams,
  RequestResult,
  TypeDefinition,
} from "../common/types.ts";
import { ServerClient } from "./client.ts";

export class RequestManager<TDef extends TypeDefinition> {
  #handlers: {
    [TKey in RequestName<TDef>]?: (
      params: RequestParams<TDef, TKey>,
    ) => Promise<RequestResult<TDef, TKey>>;
  } = {};

  handleRequest<TKey extends RequestName<TDef>>(
    _client: ServerClient<TDef>,
    name: TKey,
    params: RequestParams<TDef, TKey>,
  ) {
    if (!(name in this.#handlers)) throw new Error("Handler not found");
    return this.#handlers[name]!(params);
  }

  registerHandler<TKey extends RequestName<TDef>>(
    name: TKey,
    handler: (
      params: RequestParams<TDef, TKey>,
    ) => Promise<RequestResult<TDef, TKey>>,
    overwrite: boolean,
  ) {
    if (name in this.#handlers && !overwrite) {
      throw new Error("Handler already registered");
    }
    this.#handlers[name] = handler;
  }

  unregisterHandler<TKey extends RequestName<TDef>>(
    name: TKey,
    handler: (
      params: RequestParams<TDef, TKey>,
    ) => Promise<RequestResult<TDef, TKey>>,
  ) {
    if (this.#handlers[name] == handler) {
      delete this.#handlers[name];
    }
  }
}
