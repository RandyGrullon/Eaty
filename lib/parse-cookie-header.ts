/**
 * Devuelve el valor de una cookie a partir del header "Cookie" de un Request.
 */
export function getCookieValueFromRequest(
  req: Request,
  name: string
): string | null {
  return getCookieValueFromString(req.headers.get("cookie"), name);
}

export function getCookieValueFromString(
  header: string | null,
  name: string
): string | null {
  if (!header) return null;
  const parts = header.split(";");
  for (const p of parts) {
    const s = p.trim();
    const i = s.indexOf("=");
    if (i <= 0) continue;
    if (s.slice(0, i) !== name) continue;
    try {
      return decodeURIComponent(s.slice(i + 1).trim());
    } catch {
      return s.slice(i + 1).trim();
    }
  }
  return null;
}
