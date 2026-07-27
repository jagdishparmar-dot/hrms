/** Public store / download page for the CheckIn mobile app (QR on login). */
export function getMobileAppDownloadUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_MOBILE_APP_DOWNLOAD_URL?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
