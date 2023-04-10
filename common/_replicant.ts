export type ReplicantSubscriptionHandler<TValue> = (
  newValue: TValue | undefined,
  oldValue: TValue | undefined,
) => void;

export interface Replicant<TValue> {
  subscribe(handler: ReplicantSubscriptionHandler<TValue>): void;
  unsubscribe(handler: ReplicantSubscriptionHandler<TValue>): void;
  getValue(): TValue | undefined;
  setValue(value: TValue): Promise<void>;
}
