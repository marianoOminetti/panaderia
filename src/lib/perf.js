/** Marcas de performance para diagnóstico (DevTools + Sentry breadcrumbs). */
export function perfMark(name) {
  if (typeof performance === "undefined" || !performance.mark) return;
  performance.mark(name);
  if (process.env.REACT_APP_SENTRY_DSN) {
    import("@sentry/react")
      .then(({ addBreadcrumb }) => {
        addBreadcrumb({ category: "perf", message: name, level: "info" });
      })
      .catch(() => {});
  }
}

export function perfMeasure(name, startMark, endMark) {
  if (typeof performance === "undefined" || !performance.measure) return;
  try {
    performance.measure(name, startMark, endMark);
  } catch {
    // ignore missing marks
  }
}
