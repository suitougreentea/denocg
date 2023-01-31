import { CommonConfig } from "../common/config.ts";

export type ServerConfig = CommonConfig & {
  assetsRoot: string;
  assetsPort: number;
};
