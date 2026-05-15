import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { registerFranchiseIceServiceWorker } from "./serviceWorkerRegistration";
import "./styles/theme.css";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerFranchiseIceServiceWorker();
