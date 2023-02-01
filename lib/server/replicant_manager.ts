import { Replicant, ReplicantHandlers } from "../common/replicant.ts";
import {
  ReplicantName,
  ReplicantType,
  TypeDefinition,
} from "../common/types.ts";
import { ServerClient } from "./client.ts";
import { ServerConfig } from "./config.ts";

type ServerManagedReplicant<TDef extends TypeDefinition, TValue> = {
  currentValue?: TValue;
  handlers: ReplicantHandlers<TValue>;
  replicant: Replicant<TValue>;
  subscribingClients: Set<ServerClient<TDef>>;
};

export class ReplicantManager<TDef extends TypeDefinition> {
  #config: ServerConfig<TDef>;
  #managedReplicants: {
    [TKey in ReplicantName<TDef>]?: ServerManagedReplicant<
      TDef,
      ReplicantType<TDef, TKey>
    >;
  } = {};

  constructor(config: ServerConfig<TDef>) {
    this.#config = config;
  }

  #createReplicant<TKey extends ReplicantName<TDef>>(name: TKey) {
    const replicantConfig = this.#config.replicants
      ? this.#config.replicants[name]
      : {};
    const handlers: ReplicantHandlers<ReplicantType<TDef, TKey>> = {};
    handlers.setValueFromLocal = (value: ReplicantType<TDef, TKey>) => {
      this.#managedReplicants[name]!.currentValue = value;
      this.#broadcastUpdate(name);
      return Promise.resolve();
    };
    const replicant = new Replicant(handlers);
    this.#managedReplicants[name] = {
      currentValue: replicantConfig?.defaultValue,
      handlers,
      replicant,
      subscribingClients: new Set(),
    };
  }

  getReplicant<TKey extends ReplicantName<TDef>>(name: TKey) {
    if (!Object.hasOwn(this.#managedReplicants, name)) {
      this.#createReplicant(name);
    }
    return this.#managedReplicants[name]!;
  }

  subscribeReplicantFromClient<TKey extends ReplicantName<TDef>>(
    client: ServerClient<TDef>,
    name: TKey,
  ) {
    if (!Object.hasOwn(this.#managedReplicants, name)) {
      this.#createReplicant(name);
    }

    const replicant = this.#managedReplicants[name]!;
    replicant.subscribingClients.add(client);
    return { currentValue: replicant.currentValue };
  }

  updateReplicantValueFromClient<TKey extends ReplicantName<TDef>>(
    _client: ServerClient<TDef>,
    name: TKey,
    value: ReplicantType<TDef, TKey>,
  ) {
    if (!Object.hasOwn(this.#managedReplicants, name)) return;

    const managedReplicant = this.#managedReplicants[name]!;
    managedReplicant.currentValue = value;
    managedReplicant.handlers.setValueFromRemote!(value);
    this.#broadcastUpdate(name);
  }

  #broadcastUpdate<TKey extends ReplicantName<TDef>>(name: TKey) {
    const managedReplicant = this.#managedReplicants[name]!;
    managedReplicant.subscribingClients.forEach((client) => {
      client.jsonRpcSender.notify("updateReplicantValue", { name, value: managedReplicant.currentValue! });
    });
  }
}
