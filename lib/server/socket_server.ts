import { serve } from "./deps.ts";
import { ServerConfig } from "./config.ts";
import {
  MessageListener,
  MessageName,
  MessageParams,
  ReplicantName,
  ReplicantType,
  RequestHandler,
  RequestName,
  RequestParams,
  TypeDefinition,
} from "../common/types.ts";
import { ReplicantManager } from "./replicant_manager.ts";
import { ServerClient, ServerClientHandlers } from "./client.ts";
import { Replicant } from "../common/replicant.ts";
import { logger } from "./logger.ts";
import { MessageManager } from "./message_manager.ts";
import { RequestManager } from "./request_manager.ts";

export class SocketServer<TDef extends TypeDefinition> {
  #config: ServerConfig<TDef>;
  #abortSignal?: AbortSignal;

  #clients = new Set<ServerClient<TDef>>();
  #replicantManager: ReplicantManager<TDef>;
  #requestManager: RequestManager<TDef>;
  #messageManager: MessageManager<TDef>;

  constructor(config: ServerConfig<TDef>, abortSignal?: AbortSignal) {
    this.#config = config;
    this.#abortSignal = abortSignal;
    this.#replicantManager = new ReplicantManager(this.#config);
    this.#requestManager = new RequestManager();
    this.#messageManager = new MessageManager(this.#clients);
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
          onRequestToServer: <TKey extends RequestName<TDef>>(
            client: ServerClient<TDef>,
            name: TKey,
            params: RequestParams<TDef, TKey>,
          ) => {
            return this.#requestManager.handleRequest(
              client,
              name,
              params,
            );
          },
          onBroadcastMessage: <TKey extends MessageName<TDef>>(
            client: ServerClient<TDef>,
            name: TKey,
            params: MessageParams<TDef, TKey>,
          ) => {
            this.#messageManager.receiveMessage(
              client,
              name,
              params,
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

  registerRequestHandler<TKey extends RequestName<TDef>>(
    name: TKey,
    handler: RequestHandler<TDef, TKey>,
    overwrite: boolean,
  ) {
    this.#requestManager.registerHandler(name, handler, overwrite);
  }

  unregisterRequestHandler<TKey extends RequestName<TDef>>(
    name: TKey,
    handler: RequestHandler<TDef, TKey>,
  ) {
    this.#requestManager.unregisterHandler(name, handler);
  }

  broadcastMessage<TKey extends MessageName<TDef>>(
    name: TKey,
    params: MessageParams<TDef, TKey>,
  ) {
    this.#messageManager.broadcastMessage(name, params);
  }

  addMessageListener<TKey extends MessageName<TDef>>(
    name: TKey,
    listener: MessageListener<TDef, TKey>,
  ) {
    this.#messageManager.addListener(name, listener);
  }

  removeMessageListener<TKey extends MessageName<TDef>>(
    name: TKey,
    listener: MessageListener<TDef, TKey>,
  ) {
    this.#messageManager.removeListener(name, listener);
  }
}
