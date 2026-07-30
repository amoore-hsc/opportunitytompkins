import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installClientErrorReporting } from "./lib/errorReporting";

installClientErrorReporting();

createRoot(document.getElementById("root")!).render(<App />);
