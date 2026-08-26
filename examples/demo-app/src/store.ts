import { create } from "zustand";

export interface CartItem {
  id: string;
  title: string;
  price: number;
  qty: number;
}

export type PaymentStatus = "idle" | "processing" | "paid" | "declined";

interface CheckoutState {
  items: CartItem[];
  email: string;
  validationErrors: string[];
  paymentStatus: PaymentStatus;
  addItem: (item: Omit<CartItem, "qty">) => void;
  removeItem: (id: string) => void;
  setEmail: (email: string) => void;
  submit: (cardToken: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  items: [] as CartItem[],
  email: "",
  validationErrors: [] as string[],
  paymentStatus: "idle" as PaymentStatus,
};

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  ...initialState,

  addItem: (item) =>
    set((s) => {
      const existing = s.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          items: s.items.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i)),
        };
      }
      return { items: [...s.items, { ...item, qty: 1 }] };
    }),

  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  setEmail: (email) => set({ email }),

  submit: async (cardToken) => {
    const { items, email } = get();
    const errors: string[] = [];
    if (items.length === 0) errors.push("Cart is empty.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push("Invalid email address.");
    if (errors.length > 0) {
      set({ validationErrors: errors, paymentStatus: "idle" });
      return;
    }
    set({ validationErrors: [], paymentStatus: "processing" });
    await new Promise((r) => setTimeout(r, 300)); // fake gateway
    set({ paymentStatus: cardToken === "declined_test_card" ? "declined" : "paid" });
  },

  reset: () => set(initialState),
}));

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}
