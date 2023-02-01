import { log, posix, serve, serveDir } from "./deps.ts";
import { SharedConfig } from "../common/config.ts";
import { TypeDefinition } from "../common/types.ts";
import { ServerConfig } from "./config.ts";

const logger = log.getLogger();

export class AssetsServer<TDef extends TypeDefinition> {
  #config: ServerConfig<TDef>;
  #abortSignal?: AbortSignal;

  constructor(config: ServerConfig<TDef>, abortSignal?: AbortSignal) {
    this.#config = config;
    this.#abortSignal = abortSignal;
  }

  start() {
    const sharedConfig: SharedConfig = {
      socketPort: this.#config.socketPort,
    };

    serve(
      async (request) => {
        const normalizedUrl = posix.normalize(
          decodeURIComponent(new URL(request.url).pathname),
        );
        if (normalizedUrl == "/__config.json") {
          return new Response(JSON.stringify(sharedConfig), {
            headers: { "Content-Type": "application/json; charset=UTF-8" },
          });
        }
        return await serveDir(request, { fsRoot: this.#config.assetsRoot });
      },
      { port: this.#config.assetsPort, signal: this.#abortSignal },
    );

    logger.info("Assets server started");
  }
}
