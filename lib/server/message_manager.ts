import { MessageName, MessageParams, TypeDefinition } from "../common/types.ts";
import { ServerClient } from "./client.ts";

export class MessageManager<TDef extends TypeDefinition> {
  #clients: Set<ServerClient<TDef>>;
  #listeners: {
    [TKey in MessageName<TDef>]?: Set<
      (params: MessageParams<TDef, TKey>) => void
    >;
  } = {};

  constructor(clients: Set<ServerClient<TDef>>) {
    this.#clients = clients;
  }

  broadcastMessage<TKey extends MessageName<TDef>>(
    name: TKey,
    params: MessageParams<TDef, TKey>,
  ) {
    this.#clients.forEach((client) => {
      client.jsonRpcSender.notify("broadcastMessage", { name, params });
    });
  }

  receiveMessage<TKey extends MessageName<TDef>>(
    _client: ServerClient<TDef>,
    name: TKey,
    params: MessageParams<TDef, TKey>,
  ) {
    this.#listeners[name]?.forEach((listener) => listener(params));
    this.#clients.forEach((client) => {
      client.jsonRpcSender.notify("broadcastMessage", { name, params });
    });
  }

  addListener<TKey extends MessageName<TDef>>(
    name: TKey,
    listener: (params: MessageParams<TDef, TKey>) => void,
  ) {
    if (!(name in this.#listeners)) {
      this.#listeners[name] = new Set();
    }
    this.#listeners[name]!.add(listener);
  }

  removeListener<TKey extends MessageName<TDef>>(
    name: TKey,
    listener: (params: MessageParams<TDef, TKey>) => void,
  ) {
    if (!(name in this.#listeners)) return;
    this.#listeners[name]!.delete(listener);
  }
}
