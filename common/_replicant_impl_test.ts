import { assertSpyCall, assertSpyCalls, spy } from "../test/_deps_test.ts";
import { ReplicantHandlers, ReplicantImpl } from "./_replicant_impl.ts";

Deno.test("setValue() calls handlers.setValueFromLocal()", () => {
  const handlers: ReplicantHandlers<string> = {};
  const spySetValueFromLocal = spy((_) => Promise.resolve());
  handlers.setValueFromLocal = spySetValueFromLocal;

  const replicant = new ReplicantImpl<string>(handlers);
  replicant.setValue("MyValue");

  assertSpyCall(spySetValueFromLocal, 0, { args: ["MyValue"] });
  assertSpyCalls(spySetValueFromLocal, 1);
});

Deno.test("setValue() calls handlers.setValueFromLocal() every time even when its value is unchanged", () => {
  const handlers: ReplicantHandlers<string> = {};
  const spySetValueFromLocal = spy((_) => Promise.resolve());
  handlers.setValueFromLocal = spySetValueFromLocal;

  const replicant = new ReplicantImpl<string>(handlers);
  replicant.setValue("MyValue");
  replicant.setValue("MyValue");

  assertSpyCalls(spySetValueFromLocal, 2);
});
