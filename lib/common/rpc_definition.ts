import { ReplicantName, ReplicantType, TypeDefinition } from "./types.ts";

export type ClientToServerRpc<TDef extends TypeDefinition> = {
  subscribeReplicant: <TKey extends ReplicantName<TDef>>(
    params: { name: TKey },
  ) => Promise<{ currentValue?: ReplicantType<TDef, TKey> }>;
  updateReplicantValue: <TKey extends ReplicantName<TDef>>(
    params: { name: TKey; value: ReplicantType<TDef, TKey> },
  ) => void;
};

export type ServerToClientRpc<TDef extends TypeDefinition> = {
  updateReplicantValue: <TKey extends ReplicantName<TDef>>(
    params: { name: TKey; value: ReplicantType<TDef, TKey> },
  ) => void;
};
