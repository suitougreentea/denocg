import {
  ReplicantName,
  ReplicantType,
  TypeDefinition,
} from "../common/_types.ts";

export type ReplicantConfigEntry<TValue> = {
  defaultValue?: TValue;
  persistent?: boolean;
};

export type ServerConfig<TDef extends TypeDefinition> = {
  socketHostname?: string;
  socketPort: number;
  assetsRoot: string;
  assetsPort: number;
  replicants?: {
    [TKey in ReplicantName<TDef>]?: ReplicantConfigEntry<
      ReplicantType<TDef, TKey>
    >;
  };
};
