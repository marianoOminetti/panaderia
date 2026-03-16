export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const body = req.body || {};
    const ipHeader = req.headers["x-forwarded-for"];
    const ip = Array.isArray(ipHeader)
      ? ipHeader[0]
      : (ipHeader || "").split(",")[0] || req.socket?.remoteAddress || null;

    const payload = {
      ...body,
      ip,
      ts_server: new Date().toISOString(),
      userAgent: req.headers["user-agent"] || body.userAgent || null,
    };

    // Esto es lo que va a aparecer en los logs de Vercel
    console.error("[Panaderia ClientError]", payload);

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[Panaderia ClientErrorHandlerError]", e);
    res.status(500).json({ ok: false, error: "log-failed" });
  }
}

