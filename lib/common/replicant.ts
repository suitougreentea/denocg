export type ReplicantSubscriptionHandler<TValue> = (
  newValue: TValue,
  oldValue?: TValue,
) => void;

export type Replicant<TValue> = {
  subscribe(handler: ReplicantSubscriptionHandler<TValue>): void;
  unsubscribe(handler: ReplicantSubscriptionHandler<TValue>): void;
  setValue(value: TValue): Promise<void>;
};
