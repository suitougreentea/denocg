import {
  JsonRpcIO,
  JsonRpcReceiver,
  JsonRpcSender,
} from "../common/json_rpc.ts";
import { Replicant } from "../common/replicant.ts";
import {
  ClientToServerRpc,
  ServerToClientRpc,
} from "../common/rpc_definition.ts";
import {
  ReplicantName,
  ReplicantType,
  TypeDefinition,
} from "../common/types.ts";
import { ClientReplicant } from "./replicant.ts";
import { Socket } from "./socket.ts";

export class Context<TDef extends TypeDefinition> {
  #socket: Socket;
  #jsonRpcSender: JsonRpcSender<ClientToServerRpc<TDef>>;
  #jsonRpcReceiver: JsonRpcReceiver<ServerToClientRpc<TDef>>;
  closed = false;

  #replicants: {
    [TKey in ReplicantName<TDef>]?: ClientReplicant<ReplicantType<TDef, TKey>>;
  } = {};

  constructor(address: string) {
    this.#socket = new Socket(address);
    this.#socket.addEventListener("open", (_) => {
      Object.keys(this.#replicants).forEach(
        async (name: ReplicantName<TDef>) => {
          const result = await this.#jsonRpcSender.request(
            "subscribeReplicant",
            {
              name,
              options: { defaultValue: this.#replicants[name]!.defaultValue },
            },
          );
          this.#replicants[name]!.updateValue(result.currentValue);
        },
      );
    });
    this.#socket.open();

    const jsonRpcListenerMap = new Map<
      (data: unknown) => void,
      (ev: MessageEvent) => void
    >();
    const jsonRpcIO: JsonRpcIO = {
      send: async (data) => {
        await this.#socket.waitForConnection();
        this.#socket.send(data);
      },
      addReceiveListener: (listener) => {
        const mappedListener = (ev: MessageEvent) => listener(ev.data);
        jsonRpcListenerMap.set(listener, mappedListener);
        this.#socket.addEventListener("message", mappedListener);
      },
      removeReceiveListener: (listener) => {
        const mappedListener = jsonRpcListenerMap.get(listener);
        if (mappedListener != null) {
          jsonRpcListenerMap.delete(listener);
          this.#socket.removeEventListener("message", mappedListener);
        }
      },
    };

    const rpcHandler: ServerToClientRpc<TDef> = {
      updateReplicantValue: <TKey extends ReplicantName<TDef>>(
        params: {
          name: TKey;
          value: ReplicantType<TDef, TKey>;
        },
      ) => {
        this.#replicants[params.name]?.updateValue(params.value);
      },
    };

    this.#jsonRpcSender = new JsonRpcSender(jsonRpcIO);
    this.#jsonRpcReceiver = new JsonRpcReceiver(jsonRpcIO, rpcHandler);
  }

  async getReplicant<TKey extends ReplicantName<TDef>>(
    name: TKey,
    options?: { defaultValue: ReplicantType<TDef, TKey> },
  ): Promise<Replicant<ReplicantType<TDef, TKey>>> {
    if (this.closed) throw new Error();

    if (!Object.hasOwn(this.#replicants, name)) {
      await this.#createReplicant(name, options);
    }
    const replicant = this.#replicants[name]!;
    return replicant;
  }

  async #createReplicant<TKey extends ReplicantName<TDef>>(
    name: TKey,
    options?: { defaultValue: ReplicantType<TDef, TKey> },
  ): Promise<void> {
    const setter = async (value: ReplicantType<TDef, TKey>) => {
      await this.#jsonRpcSender.notify("updateReplicantValue", { name, value });
    };
    const created = new ClientReplicant<ReplicantType<TDef, typeof name>>(
      setter,
      options?.defaultValue,
    );
    this.#replicants[name] = created;
    const filledOptions = { defaultValue: undefined, ...options };
    const result = await this.#jsonRpcSender.request("subscribeReplicant", {
      name,
      options: filledOptions,
    });
    created.updateValue(result.currentValue as ReplicantType<TDef, TKey>); // TODO: type check fails here
  }

  close() {
    this.closed = true;
    this.#socket.close();
  }
}
