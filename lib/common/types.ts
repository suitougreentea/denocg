export type TypeDefinition = {
  replicants: {
    [TKey: string]: unknown;
    [TKey: number | symbol]: never;
  };
  messages: {
    [TKey: string]: { params?: unknown };
    [TKey: number | symbol]: never;
  };
  requests: {
    [TKey: string]: { params?: unknown; result?: unknown };
    [TKey: number | symbol]: never;
  };
};

export type ReplicantName<TDef extends TypeDefinition> =
  keyof TDef["replicants"];
export type ReplicantType<
  TDef extends TypeDefinition,
  TKey extends ReplicantName<TDef>,
> = TDef["replicants"][TKey];

export type MessageName<TDef extends TypeDefinition> = keyof TDef["messages"];
export type MessageParams<
  TDef extends TypeDefinition,
  TKey extends MessageName<TDef>,
> = TDef["messages"][TKey] extends { params: unknown }
  ? TDef["messages"][TKey]["params"]
  : undefined;
export type MessageListener<
  TDef extends TypeDefinition,
  TKey extends MessageName<TDef>,
> = MessageParams<TDef, TKey> extends undefined ? () => void
  : (params: MessageParams<TDef, TKey>) => void;

export type RequestName<TDef extends TypeDefinition> = keyof TDef["requests"];
export type RequestParams<
  TDef extends TypeDefinition,
  TKey extends RequestName<TDef>,
> = TDef["requests"][TKey] extends { params: unknown }
  ? TDef["requests"][TKey]["params"]
  : undefined;
export type RequestResult<
  TDef extends TypeDefinition,
  TKey extends RequestName<TDef>,
> = TDef["requests"][TKey] extends { result: unknown }
  ? TDef["requests"][TKey]["result"]
  : void;
export type RequestHandler<
  TDef extends TypeDefinition,
  TKey extends RequestName<TDef>,
> = RequestParams<TDef, TKey> extends undefined
  ? () => RequestResult<TDef, TKey> | Promise<RequestResult<TDef, TKey>>
  : (
    params: RequestParams<TDef, TKey>,
  ) => RequestResult<TDef, TKey> | Promise<RequestResult<TDef, TKey>>;
