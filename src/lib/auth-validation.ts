const encoder = new TextEncoder();

export function passwordError(password: string): string | undefined {
  const length = encoder.encode(password).byteLength;
  if (length < 10) return "Kata sandi minimal 10 karakter.";
  if (length > 72) return "Kata sandi terlalu panjang. Gunakan maksimal 72 karakter.";
  return undefined;
}

export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
