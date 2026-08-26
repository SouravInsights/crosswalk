import { observeStore } from "@groundstate/react";
import * as groundstate from "groundstate";
import { cartTotal, useCheckoutStore } from "./store";

/**
 * The Groundstate contract for this app: what an agent may read, do, and
 * jump to. Dev builds only — init() throws in production.
 */
export function setupGroundstate(): void {
  groundstate.init({ appName: "groundstate-demo" });

  // One line: live getCheckoutState observable + flight-recorded transitions
  // (getStateHistory), auto-derived from the Zustand store.
  observeStore("checkout", useCheckoutStore, {
    select: (s) => ({
      cartItems: s.items,
      cartTotal: cartTotal(s.items),
      email: s.email,
      validationErrors: s.validationErrors,
      paymentStatus: s.paymentStatus,
    }),
    description:
      "Returns live checkout state: cart contents and total, email, validation errors, payment status. Ground truth from the store, not the DOM.",
  });

  groundstate.act(
    "submitCheckoutWithCard",
    async (args) => {
      const cardToken = typeof args.cardToken === "string" ? args.cardToken : "";
      await useCheckoutStore.getState().submit(cardToken);
      const s = useCheckoutStore.getState();
      return { paymentStatus: s.paymentStatus, validationErrors: s.validationErrors };
    },
    {
      description:
        'Submits checkout with a test card token. Use "declined_test_card" to simulate a declined payment; anything else succeeds.',
      inputSchema: {
        type: "object",
        properties: {
          cardToken: { type: "string", description: "Test card token." },
        },
        required: ["cardToken"],
      },
    },
  );

  groundstate.fixture(
    "cart_with_declined_card",
    async () => {
      const s = useCheckoutStore.getState();
      s.reset();
      s.addItem({ id: "trip-1", title: "Kyoto itinerary", price: 49 });
      s.setEmail("dev@example.com");
      await s.submit("declined_test_card");
    },
    { description: "One item in the cart, valid email, payment just declined." },
  );

  groundstate.fixture(
    "empty_cart_invalid_email",
    async () => {
      const s = useCheckoutStore.getState();
      s.reset();
      s.setEmail("not-an-email");
      await s.submit("any_card");
    },
    { description: "Empty cart plus invalid email — both validation errors present." },
  );

  groundstate.reset(() => {
    useCheckoutStore.getState().reset();
  });
}
