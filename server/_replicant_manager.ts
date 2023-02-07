import { ReplicantHandlers, ReplicantImpl } from "../common/_replicant_impl.ts";
import {
  ReplicantName,
  ReplicantType,
  TypeDefinition,
} from "../common/types.ts";
import { ServerClient } from "./_client.ts";
import { ReplicantConfigEntry, ServerConfig } from "./_config.ts";
import { logger } from "./_logger.ts";

type ServerManagedReplicant<TDef extends TypeDefinition, TValue> = {
  config: ReplicantConfigEntry<TValue>;
  currentValue?: TValue;
  handlers: ReplicantHandlers<TValue>;
  replicant: ReplicantImpl<TValue>;
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
  #dirty = false;
  #ioInProgress = false;
  #intervalId = -1;

  constructor(config: ServerConfig<TDef>) {
    this.#config = config;
  }

  async init() {
    await this.#deserialize();
    this.#intervalId = setInterval(() => this.#trySerializeIfDirty(), 500);
  }

  dispose() {
    clearInterval(this.#intervalId);
  }

  #createReplicant<TKey extends ReplicantName<TDef>>(
    name: TKey,
    overriddenDefaultValue?: ReplicantType<TDef, TKey>,
  ) {
    const replicantConfigEntry: ReplicantConfigEntry<
      ReplicantType<TDef, TKey>
    > = this.#config.replicants?.[name] ?? {};
    const handlers: ReplicantHandlers<ReplicantType<TDef, TKey>> = {};
    handlers.setValueFromLocal = (value: ReplicantType<TDef, TKey>) => {
      this.#managedReplicants[name]!.currentValue = value;
      this.#setDirty();
      this.#broadcastUpdate(name);
      return Promise.resolve();
    };
    const initialValue = overriddenDefaultValue ??
      replicantConfigEntry?.defaultValue;
    const replicant = new ReplicantImpl(handlers, initialValue);
    this.#managedReplicants[name] = {
      config: replicantConfigEntry,
      currentValue: initialValue,
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
    this.#setDirty();
    managedReplicant.handlers.setValueFromRemote!(value);
    this.#broadcastUpdate(name);
  }

  #broadcastUpdate<TKey extends ReplicantName<TDef>>(name: TKey) {
    const managedReplicant = this.#managedReplicants[name]!;
    managedReplicant.subscribingClients.forEach((client) => {
      client.jsonRpcSender.notify("updateReplicantValue", {
        name,
        value: managedReplicant.currentValue!,
      });
    });
  }

  #setDirty() {
    this.#dirty = true;
  }

  #trySerializeIfDirty() {
    if (!this.#dirty) return;
    if (this.#ioInProgress) return;
    this.#serialize();
  }

  async #serialize() {
    if (this.#ioInProgress) throw new Error();
    this.#ioInProgress = true;
    const serializedObject: { [key: string]: unknown } = {};
    Object.entries(this.#managedReplicants).forEach(
      ([name, value]: [string, ServerManagedReplicant<TDef, unknown>]) => {
        if (value.config.persistent === false) return;
        serializedObject[name] = value.currentValue;
      },
    );
    await Deno.writeTextFile(
      "replicants.json",
      JSON.stringify(serializedObject),
    );
    this.#ioInProgress = false;
    this.#dirty = false;
    logger.debug("Replicants serialized");
  }

  async #deserialize() {
    if (this.#ioInProgress) throw new Error();
    this.#ioInProgress = true;
    try {
      const serializedObject = JSON.parse(
        await Deno.readTextFile("replicants.json"),
      );
      Object.entries(serializedObject).forEach(([name, initialValue]) => {
        // TODO: validation?
        this.#createReplicant(
          name,
          initialValue as ReplicantType<TDef, string>,
        );
      });
      logger.debug("Replicants deserialized");
    } catch (e) {
      logger.warning(`Replicants deserialized with error, ${e}`);
    } finally {
      this.#ioInProgress = false;
    }
  }
}
