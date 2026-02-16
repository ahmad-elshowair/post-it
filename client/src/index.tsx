import ReactDOM from "react-dom/client";
import App from "./App";

// Suppress harmless ResizeObserver warning triggered by MUI/Bootstrap layout recalculations.
window.addEventListener("error", (e: ErrorEvent) => {
  if (
    e.message ===
    "ResizeObserver loop completed with undelivered notifications."
  ) {
    e.stopImmediatePropagation();
  }
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(<App />);
