import {
  JsonRpcIO,
  JsonRpcReceiver,
  JsonRpcSender,
} from "../common/json_rpc.ts";
import { MessageManager } from "./message_manager.ts";
import { Replicant } from "../common/replicant.ts";
import {
  ClientToServerRpc,
  ServerToClientRpc,
} from "../common/rpc_definition.ts";
import {
  MessageName,
  MessageParams,
  ReplicantName,
  ReplicantType,
  RequestName,
  RequestParams,
  TypeDefinition,
} from "../common/types.ts";
import { ReplicantManager } from "./replicant_manager.ts";
import { Socket } from "./socket.ts";

export class Client<TDef extends TypeDefinition> {
  #socket: Socket;
  #jsonRpcSender: JsonRpcSender<ClientToServerRpc<TDef>>;
  #jsonRpcReceiver: JsonRpcReceiver<ServerToClientRpc<TDef>>;
  closed = false;

  #replicantManager: ReplicantManager<TDef>;
  #messageManager: MessageManager<TDef>;

  constructor(address: string) {
    this.#socket = new Socket(address);
    this.#socket.addEventListener("open", (_) => {
      this.#replicantManager.redoAllSubscriptions();
    });
    this.#socket.open();

    const jsonRpcListenerMap = new Map<
      (data: unknown) => void,
      (ev: MessageEvent) => void
    >();
    const jsonRpcIO: JsonRpcIO = {
      send: async (data) => {
        await this.#socket.waitForConnection();
        this.#socket.send(data);
      },
      addReceiveListener: (listener) => {
        const mappedListener = (ev: MessageEvent) => listener(ev.data);
        jsonRpcListenerMap.set(listener, mappedListener);
        this.#socket.addEventListener("message", mappedListener);
      },
      removeReceiveListener: (listener) => {
        const mappedListener = jsonRpcListenerMap.get(listener);
        if (mappedListener != null) {
          jsonRpcListenerMap.delete(listener);
          this.#socket.removeEventListener("message", mappedListener);
        }
      },
    };

    const rpcHandler: ServerToClientRpc<TDef> = {
      updateReplicantValue: <TKey extends ReplicantName<TDef>>(
        params: {
          name: TKey;
          value: ReplicantType<TDef, TKey>;
        },
      ) => {
        this.#replicantManager.updateReplicantValue(params.name, params.value);
      },
      broadcastMessage: <TKey extends MessageName<TDef>>(
        params: {
          name: TKey;
          params: MessageParams<TDef, TKey>;
        },
      ) => {
        this.#messageManager.receiveMessage(params.name, params.params);
      },
    };

    this.#jsonRpcSender = new JsonRpcSender(jsonRpcIO);
    this.#jsonRpcReceiver = new JsonRpcReceiver(jsonRpcIO, rpcHandler);

    this.#replicantManager = new ReplicantManager(this.#jsonRpcSender);
    this.#messageManager = new MessageManager(this.#jsonRpcSender);
  }

  async getReplicant<TKey extends ReplicantName<TDef>>(
    name: TKey,
  ): Promise<Replicant<ReplicantType<TDef, TKey>>> {
    if (this.closed) throw new Error();

    const managedReplicant = await this.#replicantManager.getReplicant(name);
    return managedReplicant.replicant;
  }

  async requestToServer<TKey extends RequestName<TDef>>(
    ...[name, params]: RequestParams<TDef, TKey> extends undefined
      ? [name: TKey, params?: undefined]
      : [name: TKey, params: RequestParams<TDef, TKey>]
  ) {
    const rawResult = await this.#jsonRpcSender.request("requestToServer", {
      name,
      params,
    });
    return rawResult.result;
  }

  // broadcastMessage<TKey extends MessageName<TDef>>(name: TKey, params: MessageParams<TDef, TKey>) {
  broadcastMessage<TKey extends MessageName<TDef>>(
    ...[name, params]: MessageParams<TDef, TKey> extends undefined
      ? [name: TKey, params?: undefined]
      : [name: TKey, params: MessageParams<TDef, TKey>]
  ) {
    this.#messageManager.broadcastMessage(name, params);
  }

  addMessageListener<TKey extends MessageName<TDef>>(
    name: TKey,
    listener: MessageParams<TDef, TKey> extends undefined ? () => void
      : (params: MessageParams<TDef, TKey>) => void,
  ) {
    this.#messageManager.addListener(name, listener);
  }

  removeMessageListener<TKey extends MessageName<TDef>>(
    name: TKey,
    listener: MessageParams<TDef, TKey> extends undefined ? () => void
      : (params: MessageParams<TDef, TKey>) => void,
  ) {
    this.#messageManager.removeListener(name, listener);
  }

  close() {
    this.closed = true;
    this.#socket.close();
  }
}
