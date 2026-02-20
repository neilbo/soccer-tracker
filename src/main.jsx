import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth.jsx";
import { OfflineSyncProvider } from "./contexts/OfflineSyncContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <OfflineSyncProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </OfflineSyncProvider>
  </React.StrictMode>
);