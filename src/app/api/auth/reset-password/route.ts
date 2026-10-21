function backendApiBase() {
  // Browser-facing builds point NEXT_PUBLIC_API_URL at the public edge. Route
  // Handlers execute inside the deployment network, so an explicit runtime
  // INTERNAL_API_URL takes precedence and avoids calling the public origin
  // from the container itself.
  const configured = (process.env.INTERNAL_API_URL
    || process.env.NEXT_PUBLIC_API_URL
    || "http://localhost:8080/api/v1")
    .replace(/\/+$/, "");
  return configured.endsWith("/api/v1") ? configured : `${configured}/api/v1`;
}

export async function POST(request: Request) {
  let token: string;
  let password: string;

  try {
    const payload = await request.json() as { token?: unknown; password?: unknown };
    token = typeof payload.token === "string" ? payload.token : "";
    password = typeof payload.password === "string" ? payload.password : "";
  } catch {
    return Response.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  if (!token.trim()) {
    return Response.json(
      { error: "Tautan atur ulang tidak lengkap. Minta tautan baru dari halaman lupa kata sandi." },
      { status: 400 },
    );
  }
  if (password.length < 10 || password.length > 72) {
    return Response.json({ error: "Kata sandi baru harus 10-72 karakter." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${backendApiBase()}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
      cache: "no-store",
    });
    const body = await upstream.text();

    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "Layanan atur ulang kata sandi sedang tidak tersedia." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
