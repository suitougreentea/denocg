import { SharedConfig } from "../common/config.ts";
import { TypeDefinition } from "../common/types.ts";
import { Client } from "./client.ts";

export const getClient = async <TDef extends TypeDefinition>() => {
  const config = await (await fetch("/__config.json")).json() as SharedConfig;
  const hostname = window.location.hostname;
  const client = new Client<TDef>(
    `ws://${hostname}:${config.socketPort}/`,
  );
  return client;
};
