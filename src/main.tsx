import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/onest";
import "@fontsource/jetbrains-mono/500.css";
import "./index.css";
import App from "./App.tsx";
import { ToastProvider } from "./components/ui/toast";
import { capturePromoFromUrl } from "./lib/promo";

capturePromoFromUrl();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
