/** Origen público de Body Matter (subdominio en prod). Local: 3001. */
export function getBodyMatterPublicOrigin(): string {
  const v = process.env.NEXT_PUBLIC_BODYMATTER_ORIGIN?.trim();
  if (v) return v.replace(/\/$/, "");
  return "http://localhost:3001";
}
