import { posix, serve, serveDir } from "./_deps.ts";
import { TypeDefinition } from "../common/_types.ts";
import { ServerConfig } from "./_config.ts";
import { logger } from "./_logger.ts";
import { SharedConfig } from "../common/_config.ts";

export class AssetsServer<TDef extends TypeDefinition> {
  #config: ServerConfig<TDef>;
  #abortSignal?: AbortSignal;

  constructor(config: ServerConfig<TDef>, abortSignal?: AbortSignal) {
    this.#config = config;
    this.#abortSignal = abortSignal;
  }

  async start() {
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

    await Promise.resolve();
  }
}
