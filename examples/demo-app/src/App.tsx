import { cartTotal, useCheckoutStore } from "./store";

const PRODUCTS = [
  { id: "trip-1", title: "Kyoto itinerary", price: 49 },
  { id: "trip-2", title: "Lisbon weekend", price: 29 },
];

export function App() {
  const { items, email, validationErrors, paymentStatus, addItem, removeItem, setEmail, submit } =
    useCheckoutStore();

  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 480, margin: "40px auto" }}>
      <h1>Groundstate demo — checkout</h1>

      <h2>Products</h2>
      {PRODUCTS.map((p) => (
        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: 4 }}>
          <span>
            {p.title} — ${p.price}
          </span>
          <button type="button" onClick={() => addItem(p)}>
            Add
          </button>
        </div>
      ))}

      <h2>Cart (${cartTotal(items)})</h2>
      {items.length === 0 && <p>Empty.</p>}
      {items.map((i) => (
        <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: 4 }}>
          <span>
            {i.title} × {i.qty}
          </span>
          <button type="button" onClick={() => removeItem(i.id)}>
            Remove
          </button>
        </div>
      ))}

      <h2>Checkout</h2>
      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 6 }}
      />
      <button type="button" style={{ marginTop: 8 }} onClick={() => submit("valid_test_card")}>
        Pay
      </button>
      <button
        type="button"
        style={{ marginTop: 8, marginLeft: 8 }}
        onClick={() => submit("declined_test_card")}
      >
        Pay (declined card)
      </button>

      <p>
        Payment status: <strong>{paymentStatus}</strong>
      </p>
      {validationErrors.map((e) => (
        <p key={e} style={{ color: "crimson" }}>
          {e}
        </p>
      ))}
    </main>
  );
}
