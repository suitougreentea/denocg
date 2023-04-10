import { SharedConfig } from "../common/_config.ts";
import { Replicant } from "../common/_replicant.ts";
import {
  MessageListener,
  MessageName,
  MessageParams,
  ReplicantName,
  ReplicantType,
  RequestName,
  RequestParams,
  RequestResult,
  TypeDefinition,
} from "../common/_types.ts";
import { ClientImpl } from "./_client_impl.ts";

export async function getClient<TDef extends TypeDefinition>(
  config?: string | SharedConfig,
): Promise<
  Client<TDef>
> {
  let resolvedConfig: SharedConfig;
  if (typeof (config) === "object") {
    resolvedConfig = config as SharedConfig;
  } else {
    const configPath = config ?? "__config.json";
    resolvedConfig = await (await fetch(configPath)).json() as SharedConfig;
  }
  const hostname = resolvedConfig.socketHostname ?? window.location.hostname;
  const port = resolvedConfig.socketPort;
  const client = new ClientImpl<TDef>(
    `ws://${hostname}:${port}/`,
  );
  return client;
}

export interface Client<TDef extends TypeDefinition> {
  getReplicant<TKey extends ReplicantName<TDef>>(
    name: TKey,
  ): Promise<Replicant<ReplicantType<TDef, TKey>>>;
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
  requestToServer<TKey extends RequestName<TDef>>(
    ...[name, params]: RequestParams<TDef, TKey> extends undefined
      ? [name: TKey, params?: undefined]
      : [name: TKey, params: RequestParams<TDef, TKey>]
  ): Promise<RequestResult<TDef, TKey>>;
  close(): void;
  isClosed(): boolean;
}

export * as Types from "../common/_types.ts";
export * from "../common/_replicant.ts";
