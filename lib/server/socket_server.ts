import { serve } from "./deps.ts";
import { ServerConfig } from "./config.ts";
import {
  ReplicantName,
  ReplicantType,
  TypeDefinition,
} from "../common/types.ts";
import { ReplicantManager } from "./replicant_manager.ts";
import { ServerClient, ServerClientHandlers } from "./client.ts";
import { Replicant } from "../common/replicant.ts";
import { logger } from "./logger.ts";

export class SocketServer<TDef extends TypeDefinition> {
  #config: ServerConfig<TDef>;
  #abortSignal?: AbortSignal;

  #replicantManager: ReplicantManager<TDef>;
  #clients = new Set<ServerClient<TDef>>();

  constructor(config: ServerConfig<TDef>, abortSignal?: AbortSignal) {
    this.#config = config;
    this.#abortSignal = abortSignal;
    this.#replicantManager = new ReplicantManager(this.#config);
  }

  async start() {
    await this.#replicantManager.init();

    const serverPromise = serve((request, connInfo) => {
      const { response, socket } = Deno.upgradeWebSocket(request);

      socket.addEventListener("open", (_) => {
        logger.info(`New client: ${JSON.stringify(connInfo.remoteAddr)}`);

        const handlers: ServerClientHandlers<TDef> = {
          onSubscribeReplicant: <TKey extends ReplicantName<TDef>>(
            client: ServerClient<TDef>,
            name: TKey,
          ) => {
            return this.#replicantManager.subscribeReplicantFromClient(
              client,
              name,
            );
          },
          onUpdateReplicantValue: <TKey extends ReplicantName<TDef>>(
            client: ServerClient<TDef>,
            name: TKey,
            value: ReplicantType<TDef, TKey>,
          ) => {
            this.#replicantManager.updateReplicantValueFromClient(
              client,
              name,
              value,
            );
          },
        };
        this.#clients.add(new ServerClient(socket, handlers));
      });

      return response;
    }, { port: this.#config.socketPort, signal: this.#abortSignal });

    serverPromise.then(() => {
      this.#replicantManager.dispose();
    });

    logger.info("Socket server started");
  }

  getReplicant<TKey extends ReplicantName<TDef>>(
    name: TKey,
  ): Replicant<ReplicantType<TDef, TKey>> {
    const managedReplicant = this.#replicantManager.getReplicant(name);
    return managedReplicant.replicant;
  }
}
