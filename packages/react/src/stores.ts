import { type ObserveOptions, observe, record, type Unregister } from "groundstate";

/**
 * Structural type for a Zustand(-compatible) vanilla store. No dependency on
 * zustand itself — anything with getState/subscribe works.
 */
export interface StoreLike<T = unknown> {
  getState: () => T;
  subscribe: (listener: (state: T, prev: T) => void) => () => void;
}

export interface ObserveStoreOptions<T> extends ObserveOptions {
  /** Project the state before exposing it (default: the whole state, functions stripped). */
  select?: (state: T) => unknown;
  /** Also flight-record every transition (default: true). */
  record?: boolean;
}

/**
 * Auto-derive Groundstate tools from a Zustand store in one line:
 * a live `get<Name>State` observable, plus flight recording of every
 * transition into `getStateHistory`.
 *
 *   observeStore("checkout", useCheckoutStore);
 */
export function observeStore<T>(
  name: string,
  store: StoreLike<T>,
  opts: ObserveStoreOptions<T> = {},
): Unregister {
  const select = opts.select ?? ((state: T) => stripFunctions(state));

  const unobserve = observe(name, () => select(store.getState()), {
    description:
      opts.description ??
      `Returns the live "${name}" store state (auto-derived). Ground truth from the store, not the DOM.`,
  });

  let unrecord: Unregister = () => {};
  if (opts.record !== false) {
    unrecord = record(name, {
      subscribe: (listener) => store.subscribe(() => listener()),
      snapshot: () => select(store.getState()),
    });
  }

  return () => {
    unobserve();
    unrecord();
  };
}

/**
 * Structural type for a TanStack Query client. No dependency on
 * @tanstack/react-query itself.
 */
export interface QueryClientLike {
  getQueryCache: () => {
    getAll: () => Array<{
      queryKey: unknown;
      state: {
        status: string;
        fetchStatus?: string;
        dataUpdatedAt: number;
        error: unknown;
      };
    }>;
  };
}

/**
 * Auto-derive a `getQueriesState` observable from a TanStack Query client:
 * every cached query's key, status, staleness and error — the app's real
 * server-state picture, without parsing network logs.
 *
 *   observeQueries(queryClient);
 */
export function observeQueries(client: QueryClientLike, opts: ObserveOptions = {}): Unregister {
  return observe(
    "queries",
    () =>
      client
        .getQueryCache()
        .getAll()
        .map((q) => ({
          queryKey: q.queryKey,
          status: q.state.status,
          fetchStatus: q.state.fetchStatus,
          dataUpdatedAt: q.state.dataUpdatedAt,
          error: q.state.error instanceof Error ? q.state.error.message : (q.state.error ?? null),
        })),
    {
      description:
        opts.description ??
        "Returns every TanStack Query cache entry: query key, status, fetch status, last update time, and error. The app's real server-state picture.",
    },
  );
}

/** Zustand states usually mix data and action functions — expose only data. */
function stripFunctions(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v !== "function") out[k] = v;
  }
  return out;
}
