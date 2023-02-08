import { getClient } from "../client/mod.ts";
import { launchServer, ServerConfig } from "../server/mod.ts";
import { assertEquals } from "./_deps_test.ts";

type EmptyObject = Record<keyof unknown, never>;

type TypeDefinition = {
  replicants: {
    example: string;
    exampleNonPersistent: string;
    exampleWithComplexType: {
      array: number[];
      object: { nestedArray: string[] };
    };
    exampleRegularUpdateFromServer: number;
  };

  messages: {
    example: { params: { a: number; b: string } };
    exampleVoid: EmptyObject;
    exampleFromServer: { params: { tick: number } };
  };

  requests: {
    withParamsWithReturn: { params: string; result: string };
    withoutParamsWithReturn: { result: number };
    withParamsWithoutReturn: { params: string[] };
    withoutParamsWithoutReturn: EmptyObject;
  };
};

const config: ServerConfig<TypeDefinition> = {
  socketPort: 8515,
  assetsPort: 8514,
  assetsRoot: "./client",
  replicants: {
    example: {
      defaultValue: "string replicant",
    },
    exampleNonPersistent: {
      persistent: false,
      defaultValue: "string non-persistent replicant",
    },
  },
};

Deno.test(
  "Simple E2E test to check Request",
  { sanitizeOps: false, sanitizeResources: false }, // TODO: cleanup
  async () => {
    // server setup
    const abortController = new AbortController();
    const server = await launchServer(config, abortController);
    server.registerRequestHandler(
      "withParamsWithReturn",
      (input) => input.toUpperCase(),
    );

    // client setup
    const client = await getClient<TypeDefinition>();

    // test
    assertEquals(
      await client.requestToServer("withParamsWithReturn", "hello"),
      "HELLO",
    );

    // TODO: cleanup
    /*
      client.close();
      abortController.abort();
    */
  },
);
