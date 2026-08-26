import {
  type ActOptions,
  act,
  type FixtureOptions,
  fixture,
  type ObserveOptions,
  observe,
} from "groundstate";
import { type RefObject, useEffect, useRef } from "react";

/**
 * Keep the latest callback in a ref so the tool registers once (per name)
 * but always executes the freshest closure — no stale-props bugs, no
 * re-registration churn on every render.
 */
function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/**
 * Expose a read-only view of real app state as `get<Name>State`.
 * Registered while the component is mounted.
 */
export function useObservable(
  name: string,
  selector: () => unknown,
  opts: ObserveOptions = {},
): void {
  const latest = useLatest(selector);
  const description = opts.description;
  useEffect(() => {
    return observe(name, () => latest.current(), { description });
  }, [name, description, latest]);
}

/**
 * Expose a developer-blessed action while the component is mounted.
 */
export function useAction(
  name: string,
  fn: (args: Record<string, unknown>) => unknown | Promise<unknown>,
  opts: ActOptions = {},
): void {
  const latest = useLatest(fn);
  const { description, inputSchema } = opts;
  useEffect(() => {
    return act(name, (args) => latest.current(args), { description, inputSchema });
  }, [name, description, inputSchema, latest]);
}

/**
 * Register a named fixture (a one-call jump to a known app state) while the
 * component is mounted.
 */
export function useFixture(
  name: string,
  setup: () => unknown | Promise<unknown>,
  opts: FixtureOptions = {},
): void {
  const latest = useLatest(setup);
  const description = opts.description;
  useEffect(() => {
    return fixture(name, () => latest.current(), { description });
  }, [name, description, latest]);
}
