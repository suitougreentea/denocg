import equal from "npm:fast-deep-equal@3.1.3";
import { Replicant, ReplicantSubscriptionHandler } from "./_replicant.ts";

export type ReplicantHandlers<TValue> = {
  setValueFromRemote?: (value: TValue | undefined) => void;
  setValueFromLocal?: (value: TValue) => Promise<void>;
};

export class ReplicantImpl<TValue> implements Replicant<TValue> {
  #handlers: ReplicantHandlers<TValue>;
  #currentValue?: TValue;
  #subscriptionHandlers = new Set<ReplicantSubscriptionHandler<TValue>>();

  constructor(handlers: ReplicantHandlers<TValue>, initialValue?: TValue) {
    this.#handlers = handlers;
    this.#currentValue = initialValue;
    this.#handlers.setValueFromRemote = (value: TValue | undefined) =>
      this.#updateValue(value);
  }

  #updateValue(value: TValue | undefined) {
    if (!equal(this.#currentValue, value)) {
      const oldValue = this.#currentValue;
      this.#currentValue = value;
      this.#subscriptionHandlers.forEach((handler) => handler(value, oldValue));
    }
  }

  subscribe(handler: ReplicantSubscriptionHandler<TValue>) {
    this.#subscriptionHandlers.add(handler);
    handler(this.#currentValue!, undefined);
  }

  unsubscribe(handler: ReplicantSubscriptionHandler<TValue>) {
    this.#subscriptionHandlers.delete(handler);
  }

  getValue() {
    return this.#currentValue;
  }

  async setValue(value: TValue) {
    this.#updateValue(value);
    await this.#handlers.setValueFromLocal!(value);
  }
}
