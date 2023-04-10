import {
  MessageName,
  MessageParams,
  ReplicantName,
  ReplicantType,
  RequestName,
  RequestParams,
  RequestResult,
  TypeDefinition,
} from "./_types.ts";

export type ClientToServerRpc<TDef extends TypeDefinition> = {
  subscribeReplicant: <TKey extends ReplicantName<TDef>>(
    params: { name: TKey },
  ) => Promise<{ currentValue?: ReplicantType<TDef, TKey> }>;
  updateReplicantValue: <TKey extends ReplicantName<TDef>>(
    params: { name: TKey; value: ReplicantType<TDef, TKey> },
  ) => void;
  broadcastMessage: <TKey extends MessageName<TDef>>(
    params: { name: TKey; params: MessageParams<TDef, TKey> },
  ) => void;
  requestToServer: <TKey extends RequestName<TDef>>(
    params: { name: TKey; params: RequestParams<TDef, TKey> },
  ) => Promise<{ result: RequestResult<TDef, TKey> }>;
};

export type ServerToClientRpc<TDef extends TypeDefinition> = {
  updateReplicantValue: <TKey extends ReplicantName<TDef>>(
    params: { name: TKey; value: ReplicantType<TDef, TKey> },
  ) => void;
  broadcastMessage: <TKey extends MessageName<TDef>>(
    params: { name: TKey; params: MessageParams<TDef, TKey> },
  ) => void;
};
