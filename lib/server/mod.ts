import { log } from "./deps.ts";
import { ServerConfig } from "./config.ts";
import { ReplicantName, TypeDefinition } from "../common/types.ts";
import { AssetsServer } from "./assets_server.ts";
import { SocketServer } from "./socket_server.ts";

await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("INFO"),
    file: new log.handlers.FileHandler("INFO", { filename: "./server.log" }),
  },
  loggers: {
    default: { level: "DEBUG", handlers: ["console", "file"] },
  },
});

export const launchServer = <TDef extends TypeDefinition>(
  config: ServerConfig<TDef>,
  abortController?: AbortController,
) => {
  const assetsServer = new AssetsServer(config, abortController?.signal);
  const socketServer = new SocketServer(config, abortController?.signal);
  assetsServer.start();
  socketServer.start();

  return {
    getReplicant: <TKey extends ReplicantName<TDef>>(
      name: TKey,
    ) => socketServer.getReplicant(name),
  }
};

export { type ServerConfig } from "./config.ts";
