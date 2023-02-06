import { ServerConfig } from "./config.ts";
import {
  MessageListener,
  MessageName,
  MessageParams,
  ReplicantName,
  RequestHandler,
  RequestName,
  TypeDefinition,
} from "../common/types.ts";
import { AssetsServer } from "./assets_server.ts";
import { SocketServer } from "./socket_server.ts";

export const launchServer = async <TDef extends TypeDefinition>(
  config: ServerConfig<TDef>,
  abortController?: AbortController,
) => {
  const assetsServer = new AssetsServer(config, abortController?.signal);
  const socketServer = new SocketServer(config, abortController?.signal);
  await Promise.all([assetsServer.start(), await socketServer.start()]);

  return {
    getReplicant: <TKey extends ReplicantName<TDef>>(
      name: TKey,
    ) => socketServer.getReplicant(name),
    registerRequestHandler: <TKey extends RequestName<TDef>>(
      name: TKey,
      handler: RequestHandler<TDef, TKey>,
      overwrite = false,
    ) => socketServer.registerRequestHandler(name, handler, overwrite),
    unregisterRequestHandler: <TKey extends RequestName<TDef>>(
      name: TKey,
      handler: RequestHandler<TDef, TKey>,
    ) => socketServer.unregisterRequestHandler(name, handler),
    broadcastMessage: <TKey extends MessageName<TDef>>(
      ...[name, params]: MessageParams<TDef, TKey> extends undefined
        ? [name: TKey, params?: undefined]
        : [name: TKey, params: MessageParams<TDef, TKey>]
    ) => socketServer.broadcastMessage(name, params),
    addMessageListener: <TKey extends MessageName<TDef>>(
      name: TKey,
      listener: MessageListener<TDef, TKey>,
    ) => socketServer.addMessageListener(name, listener),
    removeMessageListener: <TKey extends MessageName<TDef>>(
      name: TKey,
      listener: MessageListener<TDef, TKey>,
    ) => socketServer.removeMessageListener(name, listener),
  };
};

export { type ServerConfig } from "./config.ts";
