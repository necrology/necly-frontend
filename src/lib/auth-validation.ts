const encoder = new TextEncoder();

export function passwordError(password: string): string | undefined {
  const length = encoder.encode(password).byteLength;
  if (length < 10 || length > 72) return "Kata sandi harus terdiri dari 10–72 byte.";
  return undefined;
}

export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
