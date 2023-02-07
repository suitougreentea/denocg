import { SharedConfig } from "../common/_config.ts";
import { Replicant } from "../common/replicant.ts";
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
} from "../common/types.ts";
import { ClientImpl } from "./_client_impl.ts";

export async function getClient<TDef extends TypeDefinition>(): Promise<
  Client<TDef>
> {
  const config = await (await fetch("/__config.json")).json() as SharedConfig;
  const hostname = window.location.hostname;
  const client = new ClientImpl<TDef>(
    `ws://${hostname}:${config.socketPort}/`,
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
