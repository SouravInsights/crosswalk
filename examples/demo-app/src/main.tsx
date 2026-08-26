import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { setupGroundstate } from "./groundstate-setup";

if (import.meta.env.DEV) {
  setupGroundstate();
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element");

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
