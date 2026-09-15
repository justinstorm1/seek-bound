export const QR_TOKEN_PREFIX = 'HNS:';
export const QR_JOIN_PREFIX = 'HNSJOIN:';

/** Payload encoded in a hider's QR code (scanned by a seeker to catch them). */
export function encodeTokenQr(token: string): string {
  return `${QR_TOKEN_PREFIX}${token}`;
}

/** Extracts the raw player token from a scanned QR payload, or null. */
export function parseQrToken(data: string): string | null {
  const trimmed = data.trim();
  if (!trimmed.startsWith(QR_TOKEN_PREFIX)) return null;
  const token = trimmed.slice(QR_TOKEN_PREFIX.length);
  return /^[A-Z0-9]{8,64}$/.test(token) ? token : null;
}

/** Payload encoded in a lobby's QR code (scanned by a player to join). */
export function encodeJoinQr(code: string): string {
  return `${QR_JOIN_PREFIX}${code}`;
}

/** Extracts a game join code from a scanned QR payload, or null. */
export function parseJoinQr(data: string): string | null {
  const trimmed = data.trim();
  const raw = trimmed.startsWith(QR_JOIN_PREFIX)
    ? trimmed.slice(QR_JOIN_PREFIX.length)
    : trimmed;
  const code = raw.toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}
