import * as Sentry from "@sentry/react";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import FacturaFiscalPreviewDev from "./components/dev/FacturaFiscalPreviewDev";
import reportWebVitals from "./reportWebVitals";

const isFacturaPreviewDev =
  process.env.NODE_ENV === "development" &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("preview") === "factura";

const sentryDsn = process.env.REACT_APP_SENTRY_DSN;
const sentryEnvironment =
  process.env.REACT_APP_ENV || process.env.NODE_ENV || "development";

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: sentryEnvironment,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    // Evitar duplicar unhandledrejection: lo manejamos con reportError abajo
    integrations: (integrations) =>
      integrations.map((integration) => {
        if (integration.name !== "GlobalHandlers") return integration;
        return Sentry.globalHandlersIntegration({
          onunhandledrejection: false,
        });
      }),
  });
}

// Captura errores no manejados globalmente
window.addEventListener("unhandledrejection", (e) => {
  import("./utils/errorReport").then(({ reportError }) => {
    reportError(e.reason, { type: "unhandledrejection" });
  });
});

function SentryCrashFallback({ resetError }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <p style={{ margin: 0, fontSize: 18 }}>Algo salió mal en la app.</p>
      <button type="button" onClick={resetError}>
        Reintentar
      </button>
    </div>
  );
}

const RootApp = isFacturaPreviewDev ? FacturaFiscalPreviewDev : App;

const appTree = (
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  sentryDsn ? (
    <Sentry.ErrorBoundary fallback={SentryCrashFallback} showDialog={false}>
      {appTree}
    </Sentry.ErrorBoundary>
  ) : (
    appTree
  )
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
