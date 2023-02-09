import {
  assertEquals,
  assertSpyCall,
  assertSpyCalls,
  spy,
} from "../test/_deps_test.ts";
import { ReplicantHandlers, ReplicantImpl } from "./_replicant_impl.ts";

const createTestReplicant = <TValue>() => {
  const handlers: ReplicantHandlers<TValue> = {};
  const spySetValueFromLocal = spy((_: TValue) => Promise.resolve());
  handlers.setValueFromLocal = spySetValueFromLocal;
  const replicant = new ReplicantImpl<TValue>(handlers);
  return { replicant, handlers, spySetValueFromLocal };
};

const createTestSubscription = <TValue>() => {
  return spy((_newValue?: TValue, _oldValue?: TValue) => {});
};

Deno.test("setValue() can set a value and getValue() returns it", () => {
  const { replicant } = createTestReplicant<string>();
  replicant.setValue("MyValue1");
  assertEquals(replicant.getValue(), "MyValue1");
  replicant.setValue("MyValue2");
  assertEquals(replicant.getValue(), "MyValue2");
  replicant.setValue("MyValue2"); // unchanged
  assertEquals(replicant.getValue(), "MyValue2");
});

Deno.test("setValue() calls handlers.setValueFromLocal()", () => {
  const { replicant, spySetValueFromLocal } = createTestReplicant<string>();
  replicant.setValue("MyValue");
  assertSpyCall(spySetValueFromLocal, 0, { args: ["MyValue"] });
  assertSpyCalls(spySetValueFromLocal, 1);
});

Deno.test("setValue() calls handlers.setValueFromLocal() every time even when its value is unchanged", () => {
  const { replicant, spySetValueFromLocal } = createTestReplicant<string>();
  replicant.setValue("MyValue");
  replicant.setValue("MyValue");
  assertSpyCalls(spySetValueFromLocal, 2);
});

Deno.test("handlers.setValueFromRemote() updates the value", () => {
  const { replicant, handlers } = createTestReplicant<string>();
  handlers.setValueFromRemote?.("MyValue1");
  assertEquals(replicant.getValue(), "MyValue1");
  handlers.setValueFromRemote?.("MyValue2");
  handlers.setValueFromRemote?.("MyValue2"); // unchanged
  assertEquals(replicant.getValue(), "MyValue2");
});

Deno.test("handlers.setValueFromRemote() does not call handlers.setValueFromLocal()", () => {
  const { handlers, spySetValueFromLocal } = createTestReplicant<string>();
  handlers.setValueFromRemote?.("MyValue1");
  handlers.setValueFromRemote?.("MyValue2");
  assertSpyCalls(spySetValueFromLocal, 0);
});

Deno.test("subscribe() immediately calls its handler with oldValue = undefined", () => {
  const { replicant } = createTestReplicant<string>();

  const spySubscription1 = createTestSubscription<string>();
  replicant.subscribe(spySubscription1);
  assertSpyCall(spySubscription1, 0, { args: [undefined, undefined] });
  assertSpyCalls(spySubscription1, 1);

  const spySubscription2 = createTestSubscription<string>();
  replicant.setValue("MyValue");
  replicant.subscribe(spySubscription2);
  assertSpyCall(spySubscription2, 0, { args: ["MyValue", undefined] });
  assertSpyCalls(spySubscription2, 1);
});

Deno.test("subscription is called only when the replicant's value is changed", () => {
  const { replicant, handlers } = createTestReplicant<string>();
  const spySubscription = createTestSubscription<string>();
  replicant.subscribe(spySubscription);

  handlers.setValueFromRemote?.(undefined);
  assertSpyCalls(spySubscription, 1);

  replicant.setValue("MyValue1");
  assertSpyCalls(spySubscription, 2);
  assertSpyCall(spySubscription, 1, { args: ["MyValue1", undefined] });

  replicant.setValue("MyValue1");
  assertSpyCalls(spySubscription, 2);

  handlers.setValueFromRemote?.("MyValue1");
  assertSpyCalls(spySubscription, 2);

  replicant.setValue("MyValue2");
  assertSpyCalls(spySubscription, 3);
  assertSpyCall(spySubscription, 2, { args: ["MyValue2", "MyValue1"] });

  handlers.setValueFromRemote?.(undefined); // remote can set undefined
  assertSpyCalls(spySubscription, 4);
  assertSpyCall(spySubscription, 3, { args: [undefined, "MyValue2"] });
});

Deno.test("value change detection can work on complex object", () => {
  type ComplexObject = {
    a: string;
    b: { c?: number; d: boolean[]; e: { [key: string]: number } };
  };
  const { replicant } = createTestReplicant<ComplexObject>();
  const spySubscription = createTestSubscription<ComplexObject>();
  replicant.subscribe(spySubscription);

  replicant.setValue({ a: "", b: { d: [], e: {} } });
  assertSpyCalls(spySubscription, 2);

  replicant.setValue({ a: "", b: { d: [], e: {} } });
  assertSpyCalls(spySubscription, 2);

  replicant.setValue({ a: "", b: { c: 0, d: [], e: {} } });
  assertSpyCalls(spySubscription, 3);

  replicant.setValue({ a: "", b: { d: [], e: {} } });
  assertSpyCalls(spySubscription, 4);

  replicant.setValue({
    a: "MyValue",
    b: {
      c: 100,
      d: [true, false, true, true, false],
      e: { key1: 0, key2: 100 },
    },
  });
  assertSpyCalls(spySubscription, 5);

  replicant.setValue({
    a: "MyValue",
    b: {
      c: 100,
      d: [true, false, true, true, false],
      e: { key1: 0, key2: 100 },
    },
  });
  assertSpyCalls(spySubscription, 5);

  replicant.setValue({
    a: "MyValue",
    b: {
      c: 100,
      d: [true, false, true, true, false],
      e: { key1: 0, key2: 99 },
    },
  });
  assertSpyCalls(spySubscription, 6);
});

Deno.test("unsubscribe() can unsubscribe a previous subscription", () => {
  const { replicant } = createTestReplicant<string>();

  const spySubscription1 = createTestSubscription<string>();
  const spySubscription2 = createTestSubscription<string>();
  replicant.subscribe(spySubscription1);
  replicant.subscribe(spySubscription2);

  replicant.setValue("MyValue1");

  replicant.unsubscribe(spySubscription1);

  replicant.setValue("MyValue2");

  assertSpyCalls(spySubscription1, 2);
  assertSpyCalls(spySubscription2, 3);
});
