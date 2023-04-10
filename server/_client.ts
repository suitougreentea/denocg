import {
  MessageName,
  MessageParams,
  ReplicantName,
  ReplicantType,
  RequestName,
  RequestParams,
  RequestResult,
  TypeDefinition,
} from "../common/_types.ts";
import {
  JsonRpcIO,
  JsonRpcReceiver,
  JsonRpcSender,
} from "../common/_json_rpc.ts";
import {
  ClientToServerRpc,
  ServerToClientRpc,
} from "../common/_rpc_definition.ts";

export type ServerClientHandlers<TDef extends TypeDefinition> = {
  onSubscribeReplicant: <TKey extends ReplicantName<TDef>>(
    client: ServerClient<TDef>,
    name: TKey,
  ) => { currentValue?: ReplicantType<TDef, TKey> };
  onUpdateReplicantValue: <TKey extends ReplicantName<TDef>>(
    client: ServerClient<TDef>,
    name: TKey,
    value: ReplicantType<TDef, TKey>,
  ) => void;
  onBroadcastMessage: <TKey extends MessageName<TDef>>(
    client: ServerClient<TDef>,
    name: TKey,
    params: MessageParams<TDef, TKey>,
  ) => void;
  onRequestToServer: <TKey extends RequestName<TDef>>(
    client: ServerClient<TDef>,
    name: TKey,
    params: RequestParams<TDef, TKey>,
  ) => Promise<RequestResult<TDef, TKey>>;
};

export class ServerClient<TDef extends TypeDefinition> {
  #socket: WebSocket;
  #handler: ServerClientHandlers<TDef>;
  jsonRpcSender: JsonRpcSender<ServerToClientRpc<TDef>>;
  #jsonRpcReceiver: JsonRpcReceiver<ClientToServerRpc<TDef>>;

  constructor(socket: WebSocket, handler: ServerClientHandlers<TDef>) {
    this.#socket = socket;
    this.#handler = handler;

    const rpcHandler: ClientToServerRpc<TDef> = {
      subscribeReplicant: async <TKey extends ReplicantName<TDef>>(
        params: { name: TKey },
      ) => {
        await Promise.resolve();
        const { currentValue } = this.#handler.onSubscribeReplicant(
          this,
          params.name,
        );
        return { currentValue };
      },
      updateReplicantValue: <TKey extends ReplicantName<TDef>>(
        params: {
          name: TKey;
          value: ReplicantType<TDef, TKey>;
        },
      ) => {
        this.#handler.onUpdateReplicantValue(this, params.name, params.value);
      },
      broadcastMessage: <TKey extends MessageName<TDef>>(
        params: {
          name: TKey;
          params: MessageParams<TDef, TKey>;
        },
      ) => {
        this.#handler.onBroadcastMessage(this, params.name, params.params);
      },
      requestToServer: async <TKey extends RequestName<TDef>>(
        params: {
          name: TKey;
          params: RequestParams<TDef, TKey>;
        },
      ) => {
        const result = await this.#handler.onRequestToServer(
          this,
          params.name,
          params.params,
        );
        return { result };
      },
    };

    const jsonRpcListenerMap = new Map<
      (data: unknown) => void,
      (ev: MessageEvent) => void
    >();
    const jsonRpcIO: JsonRpcIO = {
      send: async (data) => {
        if (socket.readyState != WebSocket.OPEN) return;
        socket.send(JSON.stringify(data));
        await Promise.resolve();
      },
      addReceiveListener: (listener) => {
        const mappedListener = (ev: MessageEvent) => {
          try {
            const parsed = JSON.parse(ev.data);
            listener(parsed);
          } catch (_) {
            console.warn("Unsupported data received: ", ev.data);
          }
        };
        jsonRpcListenerMap.set(listener, mappedListener);
        socket.addEventListener("message", mappedListener);
      },
      removeReceiveListener: (listener) => {
        const mappedListener = jsonRpcListenerMap.get(listener);
        if (mappedListener != null) {
          jsonRpcListenerMap.delete(listener);
          socket.removeEventListener("message", mappedListener);
        }
      },
    };

    this.jsonRpcSender = new JsonRpcSender<ServerToClientRpc<TDef>>(jsonRpcIO);
    this.#jsonRpcReceiver = new JsonRpcReceiver(jsonRpcIO, rpcHandler);
  }
}
