import { TypeDefinition } from "../common/types.ts";
import { ClientConfig } from "./config.ts";
import { Context } from "./context.ts";

export const getContext = async <TDef extends TypeDefinition>(
  config: ClientConfig,
) => {
  await Promise.resolve();
  const hostname = window.location.hostname;
  const context = new Context<TDef>(
    `ws://${hostname}:${config.socketPort}/`,
  );
  return context;
};

export { type CommonConfig } from "../common/config.ts";
export { type ClientConfig } from "./config.ts";
