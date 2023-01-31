export type TypeDefinition = {
  replicants: {
    [TKey: string]: unknown;
    [TKey: number]: never;
    [TKey: symbol]: never;
  };
};

export type ReplicantName<TDef extends TypeDefinition> =
  keyof TDef["replicants"];
export type ReplicantType<
  TDef extends TypeDefinition,
  TKey extends ReplicantName<TDef>,
> = TDef["replicants"][TKey];
