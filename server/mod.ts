import { ServerConfig } from "./_config.ts";
import {
  MessageListener,
  MessageName,
  MessageParams,
  ReplicantName,
  ReplicantType,
  RequestHandler,
  RequestName,
  TypeDefinition,
} from "../common/_types.ts";
import { AssetsServer } from "./_assets_server.ts";
import { SocketServer } from "./_socket_server.ts";
import { Replicant } from "../common/_replicant.ts";

export async function launchServer<TDef extends TypeDefinition>(
  config: ServerConfig<TDef>,
  abortController?: AbortController,
): Promise<Server<TDef>> {
  const assetsServer = new AssetsServer(config, abortController?.signal);
  const socketServer = new SocketServer(config, abortController?.signal);
  await Promise.all([assetsServer.start(), await socketServer.start()]);

  return {
    getReplicant: (name) => socketServer.getReplicant(name),
    broadcastMessage: (name, params?) =>
      socketServer.broadcastMessage(name, params),
    addMessageListener: (name, listener) =>
      socketServer.addMessageListener(name, listener),
    removeMessageListener: (name, listener) =>
      socketServer.removeMessageListener(name, listener),
    registerRequestHandler: (name, handler, overwrite = false) =>
      socketServer.registerRequestHandler(name, handler, overwrite),
    unregisterRequestHandler: (name, handler) =>
      socketServer.unregisterRequestHandler(name, handler),
  };
}

export interface Server<TDef extends TypeDefinition> {
  getReplicant<TKey extends ReplicantName<TDef>>(
    name: TKey,
  ): Replicant<ReplicantType<TDef, TKey>>;
  broadcastMessage<TKey extends MessageName<TDef>>(
    ...[name, params]: MessageParams<TDef, TKey> extends undefined
      ? [name: TKey, params?: undefined]
      : [name: TKey, params: MessageParams<TDef, TKey>]
  ): void;
  addMessageListener<TKey extends MessageName<TDef>>(
    name: TKey,
    listener: MessageListener<TDef, TKey>,
  ): void;
  removeMessageListener<TKey extends MessageName<TDef>>(
    name: TKey,
    listener: MessageListener<TDef, TKey>,
  ): void;
  registerRequestHandler<TKey extends RequestName<TDef>>(
    name: TKey,
    handler: RequestHandler<TDef, TKey>,
    overwrite?: boolean,
  ): void;
  unregisterRequestHandler<TKey extends RequestName<TDef>>(
    name: TKey,
    handler: RequestHandler<TDef, TKey>,
  ): void;
}

export { type ServerConfig } from "./_config.ts";

export * as Types from "../common/_types.ts";
export * from "../common/_replicant.ts";
