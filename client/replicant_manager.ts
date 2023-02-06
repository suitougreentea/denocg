import { ClientToServerRpc } from "../common/rpc_definition.ts";
import { JsonRpcSender } from "../common/json_rpc.ts";
import {
  ReplicantName,
  ReplicantType,
  TypeDefinition,
} from "../common/types.ts";
import { Replicant, ReplicantHandlers } from "../common/replicant.ts";

type ClientManagedReplicant<TDef extends TypeDefinition, TValue> = {
  handlers: ReplicantHandlers<TValue>;
  replicant: Replicant<TValue>;
};

export class ReplicantManager<TDef extends TypeDefinition> {
  #jsonRpcSender: JsonRpcSender<ClientToServerRpc<TDef>>;
  #managedReplicants: {
    [TKey in ReplicantName<TDef>]?: ClientManagedReplicant<
      TDef,
      ReplicantType<TDef, TKey>
    >;
  } = {};

  constructor(jsonRpcSender: JsonRpcSender<ClientToServerRpc<TDef>>) {
    this.#jsonRpcSender = jsonRpcSender;
  }

  async #createReplicant<TKey extends ReplicantName<TDef>>(name: TKey) {
    const handlers: ReplicantHandlers<ReplicantType<TDef, TKey>> = {};
    handlers.setValueFromLocal = async (value: ReplicantType<TDef, TKey>) => {
      await this.#jsonRpcSender.notify("updateReplicantValue", { name, value });
    };
    const replicant = new Replicant(handlers);
    this.#managedReplicants[name] = { handlers, replicant };

    const result = await this.#jsonRpcSender.request("subscribeReplicant", {
      name,
    });
    handlers.setValueFromRemote!(
      result.currentValue as ReplicantType<TDef, TKey>,
    ); // TODO: type check fails here
  }

  async getReplicant<TKey extends ReplicantName<TDef>>(name: TKey) {
    if (!Object.hasOwn(this.#managedReplicants, name)) {
      await this.#createReplicant(name);
    }
    return this.#managedReplicants[name]!;
  }

  updateReplicantValue<TKey extends ReplicantName<TDef>>(
    name: TKey,
    value: ReplicantType<TDef, TKey>,
  ) {
    if (!Object.hasOwn(this.#managedReplicants, name)) return;
    this.#managedReplicants[name]!.handlers.setValueFromRemote!(value);
  }

  redoAllSubscriptions() {
    return Promise.all(
      Object.keys(this.#managedReplicants).map(
        async (name: ReplicantName<TDef>) => {
          const result = await this.#jsonRpcSender.request(
            "subscribeReplicant",
            { name },
          );
          this.#managedReplicants[name]!.handlers.setValueFromRemote!(
            result.currentValue,
          );
        },
      ),
    );
  }
}
