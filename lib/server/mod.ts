import { serve } from "https://deno.land/std@0.175.0/http/mod.ts";
import { serveDir } from "https://deno.land/std@0.175.0/http/file_server.ts";
import { ServerConfig } from "./config.ts";
import {
  JsonRpcIO,
  JsonRpcReceiver,
  JsonRpcSender,
} from "../common/json_rpc.ts";
import {
  ClientToServerRpc,
  ServerToClientRpc,
} from "../common/rpc_definition.ts";
import {
  ReplicantName,
  ReplicantType,
  TypeDefinition,
} from "../common/types.ts";

export const launchServer = <TDef extends TypeDefinition>(
  config: ServerConfig,
  abortController?: AbortController,
) => {
  class ServerReplicant<TValue> {
    currentValue?: TValue;
    senders = new Set<JsonRpcSender<ServerToClientRpc<TDef>>>();
  }

  const assetsServerPromise = serve(
    (request) => serveDir(request, { fsRoot: config.assetsRoot }),
    { port: config.assetsPort, signal: abortController?.signal },
  );

  const replicants: {
    [TKey in ReplicantName<TDef>]?: ServerReplicant<ReplicantType<TDef, TKey>>;
  } = {};

  const socketServerPromise = serve((request) => {
    const { response, socket } = Deno.upgradeWebSocket(request);

    const rpcHandler = (
      sender: JsonRpcSender<ServerToClientRpc<TDef>>,
    ): ClientToServerRpc<TDef> => ({
      subscribeReplicant: async <TKey extends ReplicantName<TDef>>(
        params: {
          name: TKey;
          options: { defaultValue?: ReplicantType<TDef, TKey> };
        },
      ) => {
        await Promise.resolve();
        if (!Object.hasOwn(replicants, params.name)) {
          replicants[params.name] = new ServerReplicant();
          replicants[params.name]!.currentValue = params.options.defaultValue;
        }
        const replicant = replicants[params.name]!;
        replicant.senders.add(sender);
        return { currentValue: replicants[params.name]!.currentValue! };
      },
      updateReplicantValue: <TKey extends ReplicantName<TDef>>(
        params: {
          name: TKey;
          value: ReplicantType<TDef, TKey>;
        },
      ) => {
        if (!Object.hasOwn(replicants, params.name)) return;
        const replicant = replicants[params.name]!;
        replicant.currentValue = params.value;
        replicant.senders.forEach((sender) => {
          sender.notify("updateReplicantValue", {
            name: params.name,
            value: replicant.currentValue!,
          });
        });
      },
    });

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

    const jsonRpcSender = new JsonRpcSender<ServerToClientRpc<TDef>>(jsonRpcIO);
    const _jsonRpcReceiver = new JsonRpcReceiver(
      jsonRpcIO,
      rpcHandler(jsonRpcSender),
    );
    return response;
  }, { port: config.socketPort, signal: abortController?.signal });

  return Promise.all([assetsServerPromise, socketServerPromise]);
};

export { type CommonConfig } from "../common/config.ts";
export { type ServerConfig } from "./config.ts";
