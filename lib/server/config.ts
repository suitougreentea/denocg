import {
  ReplicantName,
  ReplicantType,
  TypeDefinition,
} from "../common/types.ts";

export type ServerConfig<TDef extends TypeDefinition> = {
  socketPort: number;
  assetsRoot: string;
  assetsPort: number;
  replicants?: {
    [TKey in ReplicantName<TDef>]?: {
      defaultValue?: ReplicantType<TDef, TKey>;
    };
  };
};
