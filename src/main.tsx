import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

// Sentry disabled temporarily to prevent init errors
// import * as Sentry from "@sentry/react";

createRoot(document.getElementById("root")!).render(<App />);