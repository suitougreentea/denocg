import { ServerConfig } from "./config.ts";
import { ReplicantName, TypeDefinition } from "../common/types.ts";
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
  };
};

export { type ServerConfig } from "./config.ts";
