/**
 * Flight recorder: buffers state transitions so an agent gets the causal
 * trace of what happened — not just two snapshots to guess between.
 */

export interface RecordSource {
  /** Subscribe to state changes; must return an unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
  /** Return the current state (JSON-safe). */
  snapshot: () => unknown;
}

export interface HistoryEntry {
  seq: number;
  /** ISO timestamp of the transition. */
  timestamp: string;
  /** Which recorded source changed, e.g. "checkout". */
  source: string;
  /** Shallow keys that changed vs the previous snapshot ("*" for non-objects). */
  changedKeys: string[];
  /** Full state snapshot after the transition. */
  state: unknown;
}

const DEFAULT_LIMIT = 200;

export class FlightRecorder {
  private entries: HistoryEntry[] = [];
  private previous = new Map<string, unknown>();
  private seq = 0;
  private limit: number;

  constructor(limit: number = DEFAULT_LIMIT) {
    this.limit = limit;
  }

  push(source: string, state: unknown): void {
    const safe = toJsonSafeOrPlaceholder(state);
    const prev = this.previous.get(source);
    this.entries.push({
      seq: ++this.seq,
      timestamp: new Date().toISOString(),
      source,
      changedKeys: this.previous.has(source) ? shallowChangedKeys(prev, safe) : ["*initial*"],
      state: safe,
    });
    this.previous.set(source, safe);
    if (this.entries.length > this.limit) {
      this.entries.splice(0, this.entries.length - this.limit);
    }
  }

  history(filter?: { source?: string; limit?: number }): HistoryEntry[] {
    let out = this.entries;
    if (filter?.source) out = out.filter((e) => e.source === filter.source);
    if (filter?.limit && filter.limit > 0) out = out.slice(-filter.limit);
    return out;
  }

  sources(): string[] {
    return [...this.previous.keys()];
  }

  clear(): void {
    this.entries = [];
    this.previous.clear();
    this.seq = 0;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shallowChangedKeys(prev: unknown, next: unknown): string[] {
  if (!isPlainObject(prev) || !isPlainObject(next)) {
    return JSON.stringify(prev) === JSON.stringify(next) ? [] : ["*"];
  }
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) changed.push(key);
  }
  return changed;
}

function toJsonSafeOrPlaceholder(value: unknown): unknown {
  try {
    return value === undefined ? null : JSON.parse(JSON.stringify(value));
  } catch {
    return { __groundstate_unserializable: true };
  }
}
