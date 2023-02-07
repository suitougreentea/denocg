import {
  ReplicantName,
  ReplicantType,
  TypeDefinition,
} from "../common/types.ts";

export type ReplicantConfigEntry<TValue> = {
  defaultValue?: TValue;
  persistent?: boolean;
};

export type ServerConfig<TDef extends TypeDefinition> = {
  socketPort: number;
  assetsRoot: string;
  assetsPort: number;
  replicants?: {
    [TKey in ReplicantName<TDef>]?: ReplicantConfigEntry<
      ReplicantType<TDef, TKey>
    >;
  };
};
