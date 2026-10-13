const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function backendApiBase() {
  const configured = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1")
    .replace(/\/+$/, "");
  return configured.endsWith("/api/v1") ? configured : `${configured}/api/v1`;
}

export async function POST(request: Request) {
  let email: string;

  try {
    const payload = await request.json() as { email?: unknown };
    email = typeof payload.email === "string" ? payload.email.trim() : "";
  } catch {
    return Response.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "Masukkan alamat email yang valid." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${backendApiBase()}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
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
