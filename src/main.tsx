import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

// Lite-mode detection: PS5 WebKit or slow connections / low CPU
const ua = navigator.userAgent;
const isPS5 = /PlayStation/.test(ua);
const isLite =
  isPS5 ||
  (navigator.hardwareConcurrency ?? 8) <= 2 ||
  (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true;

if (isPS5) document.documentElement.classList.add("ps5");
if (isLite) document.documentElement.classList.add("lite-mode");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
