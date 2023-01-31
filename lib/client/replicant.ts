import { equal } from "https://deno.land/x/equal@v1.5.0/mod.ts";
import {
  Replicant,
  ReplicantSubscriptionHandler,
} from "../common/replicant.ts";

export class ClientReplicant<TValue> implements Replicant<TValue> {
  #currentValue?: TValue;
  defaultValue?: TValue;
  #handlers = new Set<ReplicantSubscriptionHandler<TValue>>();
  #setter: (value: TValue) => Promise<void>;

  constructor(setter: (value: TValue) => Promise<void>, defaultValue?: TValue) {
    this.defaultValue = defaultValue;
    this.#setter = setter;
  }

  updateValue(value: TValue) {
    if (!equal(this.#currentValue, value)) {
      const oldValue = this.#currentValue;
      this.#currentValue = value;
      this.#handlers.forEach((handler) => handler(value, oldValue));
    }
  }

  subscribe(handler: ReplicantSubscriptionHandler<TValue>) {
    this.#handlers.add(handler);
    if (this.#currentValue !== undefined) {
      handler(this.#currentValue!, undefined);
    }
  }

  unsubscribe(handler: ReplicantSubscriptionHandler<TValue>) {
    this.#handlers.delete(handler);
  }

  async setValue(value: TValue) {
    this.updateValue(value);
    await this.#setter(value);
  }
}
