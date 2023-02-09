import { getClient } from "../client/mod.ts";
import { launchServer, ServerConfig } from "../server/mod.ts";
import { assert, assertEquals, assertRejects } from "./_deps_test.ts";

type EmptyObject = Record<keyof unknown, never>;

type TypeDefinition = {
  replicants: EmptyObject;
  messages: EmptyObject;
  requests: {
    simple: { params: string; result: string };
    canError: { params: string; result: string };
    heavyTask: { params: string; result: string };
  };
};

const config: ServerConfig<TypeDefinition> = {
  socketPort: 8515,
  assetsPort: 8514,
  assetsRoot: "./client",
  replicants: {},
};

Deno.test(
  "E2E Request test",
  { sanitizeOps: false, sanitizeResources: false }, // TODO: cleanup
  async (t) => {
    // server setup
    const abortController = new AbortController();
    const server = await launchServer(config, abortController);
    server.registerRequestHandler("simple", (input) => input.toUpperCase());
    server.registerRequestHandler("canError", (input) => {
      if (input.startsWith("E")) throw new Error("MyError");
      return input;
    });
    server.registerRequestHandler(
      "heavyTask",
      (input) =>
        new Promise((resolve, _) =>
          setTimeout(() => resolve(input.toLowerCase()), 1000)
        ),
    );

    // client setup
    const client = await getClient<TypeDefinition>();

    // test
    await t.step("simple", async () => {
      assertEquals(
        await client.requestToServer("simple", "hello"),
        "HELLO",
      );
    });

    await t.step("canError", async () => {
      assertEquals(
        await client.requestToServer("canError", "hello"),
        "hello",
      );
      await assertRejects(async () => {
        await client.requestToServer("canError", "Ehello");
      });
    });

    await t.step("heavyTask", async () => {
      const heavyTaskStart = performance.now();
      const heavyTaskResult = await client.requestToServer(
        "heavyTask",
        "HELLO",
      );
      const heavyTaskEnd = performance.now();
      assert(heavyTaskEnd - heavyTaskStart > 900);
      assertEquals(heavyTaskResult, "hello");
    });

    await t.step("Nonexistent request", async () => {
      await assertRejects(async () => {
        // deno-lint-ignore no-explicit-any
        await client.requestToServer("nonexistent" as any);
      });
    });

    // TODO: cleanup
    /*
      client.close();
      abortController.abort();
    */
  },
);
