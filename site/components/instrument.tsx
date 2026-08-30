"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The hero instrument: the product, in miniature.
 *
 * A tiny checkout store, instrumented exactly the way examples/demo-app
 * is (same tool names, same fixture, same behavior), rendered the way an
 * agent sees it through the bridge: a state snapshot and callable tools.
 * The page demonstrates the loop instead of describing it.
 *
 * Color semantics (declared in global.css): green means read, amber
 * means mutate. Reset gets the accent treatment.
 */

interface CartItem {
  id: string;
  title: string;
  price: number;
  qty: number;
}

type PaymentStatus = "idle" | "processing" | "paid" | "declined";

interface CheckoutState {
  items: CartItem[];
  email: string;
  validationErrors: string[];
  paymentStatus: PaymentStatus;
}

/** Ground state: the baseline every experiment returns to. */
const GROUND_STATE: CheckoutState = {
  items: [],
  email: "",
  validationErrors: [],
  paymentStatus: "idle",
};

/** Where the page starts: a checkout mid-session, so the panel reads as a
 *  live system on first paint rather than an empty form. */
const INITIAL_STATE: CheckoutState = {
  items: [
    { id: "trip-1", title: "Kyoto itinerary", price: 49, qty: 1 },
    { id: "trip-2", title: "Lisbon weekend", price: 29, qty: 2 },
  ],
  email: "dev@example.com",
  validationErrors: [],
  paymentStatus: "idle",
};

function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

interface TranscriptEntry {
  id: number;
  kind: "call" | "result" | "note";
  text: string;
  signal?: boolean;
}

/* ── JSON snapshot token rendering ─────────────────────────── */

function K({ children }: { children: string }) {
  return <span className="text-dim">"{children}"</span>;
}
function P({ children }: { children: string }) {
  return <span className="text-ghost">{children}</span>;
}
function Str({
  children,
  className = "text-accent-dim",
}: {
  children: string;
  className?: string;
}) {
  return <span className={className}>"{children}"</span>;
}
function Num({ children }: { children: number }) {
  return <span className="text-ink tabular-nums">{children}</span>;
}

const STATUS_COLOR: Record<PaymentStatus, string> = {
  idle: "text-dim",
  processing: "text-signal",
  paid: "text-accent",
  declined: "text-fault",
};

function Snapshot({ state, flashKey }: { state: CheckoutState; flashKey: number }) {
  const total = cartTotal(state.items);
  return (
    <pre
      key={flashKey}
      className="gs-value px-4 py-3.5 font-mono text-[12.5px] leading-[1.75] overflow-x-auto"
      aria-live="polite"
    >
      <P>{"{"}</P>
      {"\n  "}
      <K>cartItems</K>
      <P>: </P>
      {state.items.length === 0 ? (
        <P>[],</P>
      ) : (
        <>
          <P>[</P>
          {state.items.map((item, i) => (
            <span key={item.id}>
              {"\n    "}
              <P>{"{ "}</P>
              <K>id</K>
              <P>: </P>
              <Str>{item.id}</Str>
              <P>, </P>
              <K>title</K>
              <P>: </P>
              <Str>{item.title}</Str>
              <P>, </P>
              <K>price</K>
              <P>: </P>
              <Num>{item.price}</Num>
              <P>, </P>
              <K>qty</K>
              <P>: </P>
              <Num>{item.qty}</Num>
              <P>{" }"}</P>
              {i < state.items.length - 1 ? <P>,</P> : null}
            </span>
          ))}
          {"\n  "}
          <P>],</P>
        </>
      )}
      {"\n  "}
      <K>cartTotal</K>
      <P>: </P>
      <Num>{total}</Num>
      <P>,</P>
      {"\n  "}
      <K>email</K>
      <P>: </P>
      {state.email ? <Str>{state.email}</Str> : <Str className="text-ghost">{""}</Str>}
      <P>,</P>
      {"\n  "}
      <K>validationErrors</K>
      <P>: </P>
      {state.validationErrors.length === 0 ? (
        <P>[],</P>
      ) : (
        <span className="text-fault">
          [{state.validationErrors.map((e) => `"${e}"`).join(", ")}],
        </span>
      )}
      {"\n  "}
      <K>paymentStatus</K>
      <P>: </P>
      <Str className={STATUS_COLOR[state.paymentStatus]}>{state.paymentStatus}</Str>
      {"\n"}
      <P>{"}"}</P>
    </pre>
  );
}

/* ── The instrument ────────────────────────────────────────── */

export function Instrument() {
  const [state, setState] = useState<CheckoutState>(INITIAL_STATE);
  const [flashKey, setFlashKey] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([
    {
      id: 0,
      kind: "note",
      text: "4 tools registered on this page. Call one.",
    },
  ]);
  const idRef = useRef(1);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const push = (entry: Omit<TranscriptEntry, "id">) => {
    setTranscript((t) => [...t.slice(-5), { ...entry, id: idRef.current++ }]);
  };

  const apply = (next: CheckoutState, call: string, result: string, signal = false) => {
    setState(next);
    setFlashKey((k) => k + 1);
    push({ kind: "call", text: call, signal });
    push({ kind: "result", text: result });
  };

  const readState = () => {
    setFlashKey((k) => k + 1);
    push({ kind: "call", text: "getCheckoutState()" });
    push({
      kind: "result",
      text: `← { cartItems: [${state.items.length}], cartTotal: ${cartTotal(state.items)}, paymentStatus: "${state.paymentStatus}" }`,
    });
  };

  const submitDeclined = () => {
    push({
      kind: "call",
      text: 'submitCheckoutWithCard({ cardToken: "declined_test_card" })',
      signal: true,
    });
    setState((s) => ({ ...s, paymentStatus: "processing", validationErrors: [] }));
    setFlashKey((k) => k + 1);
    window.setTimeout(() => {
      setState((s) => ({ ...s, paymentStatus: "declined" }));
      setFlashKey((k) => k + 1);
      push({ kind: "result", text: '← { paymentStatus: "declined", validationErrors: [] }' });
    }, 900);
  };

  const loadFixture = () => {
    apply(
      {
        items: [{ id: "trip-1", title: "Kyoto itinerary", price: 49, qty: 1 }],
        email: "dev@example.com",
        validationErrors: [],
        paymentStatus: "declined",
      },
      'loadFixture("cart_with_declined_card")',
      "← fixture applied in one call. No clicking there.",
      true,
    );
  };

  const reset = () => {
    apply(GROUND_STATE, "resetToGroundState()", "← ground state restored.");
  };

  // The ground-state section at the bottom of the page resets this store.
  // Written with raw setters (stable) so the listener never holds a stale
  // closure and can be registered exactly once.
  useEffect(() => {
    const onReset = () => {
      setState(GROUND_STATE);
      setFlashKey((k) => k + 1);
      setTranscript((t) => [
        ...t.slice(-4),
        { id: idRef.current++, kind: "call", text: "resetToGroundState()" },
        { id: idRef.current++, kind: "result", text: "← ground state restored." },
      ]);
    };
    window.addEventListener("groundstate:reset", onReset);
    return () => window.removeEventListener("groundstate:reset", onReset);
  }, []);

  // Keep the newest transcript line in view.
  useEffect(() => {
    const last = transcript[transcript.length - 1];
    const el = transcriptRef.current;
    if (last && el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  const processing = state.paymentStatus === "processing";

  return (
    <div className="border border-line bg-panel font-mono text-[13px]">
      {/* header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="text-ink">checkout</span>
        <span className="text-[11px] text-faint">live</span>
      </div>

      {/* state snapshot: what getCheckoutState() returns */}
      <div className="border-b border-line">
        <div className="flex items-baseline justify-between px-4 pt-3">
          <span className="text-[11px] uppercase tracking-[0.18em] text-faint">
            getCheckoutState()
          </span>
          <span className="text-[11px] text-ghost">live</span>
        </div>
        <Snapshot state={state} flashKey={flashKey} />
      </div>

      {/* callable tools */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-line border-b border-line">
        <ToolButton
          name="getCheckoutState()"
          kind="read"
          onClick={readState}
          disabled={processing}
        />
        <ToolButton
          name="submitCheckoutWithCard"
          args='{ cardToken: "declined_test_card" }'
          kind="write"
          onClick={submitDeclined}
          disabled={processing}
        />
        <ToolButton
          name="loadFixture"
          args='"cart_with_declined_card"'
          kind="write"
          onClick={loadFixture}
          disabled={processing}
        />
        <ToolButton
          name="resetToGroundState()"
          kind="reset"
          onClick={reset}
          disabled={processing}
        />
      </div>

      {/* transcript */}
      <div ref={transcriptRef} className="max-h-28 overflow-y-auto px-4 py-3 space-y-1">
        {transcript.map((entry) => (
          <p
            key={entry.id}
            className={
              entry.kind === "note"
                ? "text-[12px] text-ghost leading-relaxed"
                : entry.kind === "call"
                  ? `text-[12px] leading-relaxed ${entry.signal ? "text-signal-dim" : "text-accent-dim"}`
                  : "text-[12px] leading-relaxed text-dim"
            }
          >
            {entry.kind === "note" ? "// " : entry.kind === "call" ? "› " : ""}
            {entry.text}
          </p>
        ))}
      </div>
    </div>
  );
}

function ToolButton({
  name,
  args,
  kind,
  onClick,
  disabled,
}: {
  name: string;
  args?: string;
  kind: "read" | "write" | "reset";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        group bg-panel px-4 py-3 text-left transition-colors duration-150
        disabled:cursor-not-allowed disabled:opacity-50
        ${kind === "reset" ? "hover:bg-accent/10" : "hover:bg-panel-raised"}
      `}
      style={{ transitionTimingFunction: "var(--ease-reading)" }}
    >
      <span
        className={`block text-[12.5px] ${
          kind === "reset"
            ? "text-accent"
            : kind === "write"
              ? "text-signal"
              : "text-ink group-hover:text-accent"
        }`}
      >
        {name}
      </span>
      {args ? <span className="mt-0.5 block text-[11px] text-ghost break-all">{args}</span> : null}
    </button>
  );
}
