import { JsonRpcSender } from "../common/json_rpc.ts";
import { ClientToServerRpc } from "../common/rpc_definition.ts";
import { MessageName, MessageParams, TypeDefinition } from "../common/types.ts";

export class MessageManager<TDef extends TypeDefinition> {
  #jsonRpcSender: JsonRpcSender<ClientToServerRpc<TDef>>;
  #listeners: {
    [TKey in MessageName<TDef>]?: Set<
      (params: MessageParams<TDef, TKey>) => void
    >;
  } = {};

  constructor(jsonRpcSender: JsonRpcSender<ClientToServerRpc<TDef>>) {
    this.#jsonRpcSender = jsonRpcSender;
  }

  broadcastMessage<TKey extends MessageName<TDef>>(
    name: TKey,
    params: MessageParams<TDef, TKey>,
  ) {
    this.#jsonRpcSender.notify("broadcastMessage", { name, params });
  }

  receiveMessage<TKey extends MessageName<TDef>>(
    name: TKey,
    params: MessageParams<TDef, TKey>,
  ) {
    this.#listeners[name]?.forEach((listener) => listener(params));
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
