import { ClientToServerRpc } from "../common/_rpc_definition.ts";
import { JsonRpcSender } from "../common/_json_rpc.ts";
import {
  ReplicantName,
  ReplicantType,
  TypeDefinition,
} from "../common/_types.ts";
import { ReplicantHandlers, ReplicantImpl } from "../common/_replicant_impl.ts";

type ClientManagedReplicant<TDef extends TypeDefinition, TValue> = {
  handlers: ReplicantHandlers<TValue>;
  replicant: ReplicantImpl<TValue>;
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
    const replicant = new ReplicantImpl(handlers);
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
