import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./app/App.tsx";
import "./styles/index.css";

// Inisialisasi Sentry untuk Error Tracking di UI
try {
  Sentry.init({
    dsn: "", // Masukkan Dsn Sentry Anda di sini untuk mengaktifkan Error Tracking
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
} catch (e) {
  console.error("Sentry initialization failed:", e);
}

createRoot(document.getElementById("root")!).render(<App />);