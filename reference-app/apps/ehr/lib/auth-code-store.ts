/**
 * In-memory authorization code store.
 *
 * Holds pending PKCE authorization codes from /api/auth/authorize until they
 * are consumed by /api/auth/token. Each code is single-use and expires after
 * 60 seconds. Acceptable for a reference implementation — a production server
 * would use Redis or a database so codes survive process restarts.
 */

const CODE_TTL_MS = 60_000;

export interface PendingCode {
  clientId: string;
  patientId: string;
  scope: string;
  redirectUri: string;
  codeChallenge: string;
  /** OAuth state parameter — threaded as correlationId through the Activity feed. */
  state: string;
  expiresAt: number;
}

const store = new Map<string, PendingCode>();

/** Persist a freshly issued authorization code. */
export function storeCode(code: string, data: Omit<PendingCode, "expiresAt">): void {
  store.set(code, { ...data, expiresAt: Date.now() + CODE_TTL_MS });
}

/**
 * Look up and atomically consume an authorization code for its original
 * client. Returns the associated grant data, or `null` when the code is
 * unknown, already used, expired, or presented by another client.
 */
export function consumeCode(code: string, clientId: string): PendingCode | null {
  const entry = store.get(code);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(code);
    return null;
  }
  if (entry.clientId !== clientId) return null;
  store.delete(code); // single-use
  return entry;
}
