import { SharedConfig } from "../common/config.ts";
import { TypeDefinition } from "../common/types.ts";
import { Context } from "./context.ts";

export const getContext = async <TDef extends TypeDefinition>() => {
  const config = await (await fetch("/__config.json")).json() as SharedConfig;
  await Promise.resolve();
  const hostname = window.location.hostname;
  const context = new Context<TDef>(
    `ws://${hostname}:${config.socketPort}/`,
  );
  return context;
};
