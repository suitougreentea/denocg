import { equal } from "https://deno.land/x/equal@v1.5.0/mod.ts";

export type ReplicantSubscriptionHandler<TValue> = (
  newValue: TValue | undefined,
  oldValue: TValue | undefined,
) => void;

export type ReplicantHandlers<TValue> = {
  setValueFromRemote?: (value: TValue | undefined) => void;
  setValueFromLocal?: (value: TValue) => Promise<void>;
};

export class Replicant<TValue> {
  #handlers: ReplicantHandlers<TValue>;
  currentValue?: TValue;
  #subscriptionHandlers = new Set<ReplicantSubscriptionHandler<TValue>>();

  constructor(handlers: ReplicantHandlers<TValue>) {
    this.#handlers = handlers;
    this.#handlers.setValueFromRemote = (value: TValue | undefined) =>
      this.#updateValue(value);
  }

  #updateValue(value: TValue | undefined) {
    if (!equal(this.currentValue, value)) {
      const oldValue = this.currentValue;
      this.currentValue = value;
      this.#subscriptionHandlers.forEach((handler) => handler(value, oldValue));
    }
  }

  subscribe(handler: ReplicantSubscriptionHandler<TValue>) {
    this.#subscriptionHandlers.add(handler);
    if (this.currentValue !== undefined) {
      handler(this.currentValue!, undefined);
    }
  }

  unsubscribe(handler: ReplicantSubscriptionHandler<TValue>) {
    this.#subscriptionHandlers.delete(handler);
  }

  async setValue(value: TValue) {
    this.#updateValue(value);
    await this.#handlers.setValueFromLocal!(value);
  }
}