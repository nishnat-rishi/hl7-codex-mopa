/** SMART client configuration for the DTR Client. */
export const SMART_CLIENT_ID = "mopa-dtr-client";

/**
 * OAuth session cookies must be unique per SMART client. Cookies are scoped
 * to the host, not the port, so the DTR client (4004) and EHR (4001) share
 * the `localhost` cookie jar during local launches. Generic `smart_*` names
 * let an EHR authorization response overwrite DTR's PKCE and state values.
 */
export const DTR_TOKEN_COOKIE = "dtr_smart_token";
export const DTR_VERIFIER_COOKIE = "dtr_smart_verifier";
export const DTR_STATE_COOKIE = "dtr_smart_state";

export const SMART_REDIRECT_URI = process.env.NEXT_PUBLIC_DTR_CLIENT_URL
  ? `${process.env.NEXT_PUBLIC_DTR_CLIENT_URL}/callback`
  : "http://localhost:4004/callback";

export const SMART_SCOPE = "launch launch/patient patient/*.read openid fhirUser";

/** EHR token endpoint — matches the dedicated auth route on the EHR. */
export const TOKEN_ENDPOINT = `${
  process.env.NEXT_PUBLIC_EHR_BASE_URL ?? "http://localhost:4001"
}/api/auth/token`;

/** EHR FHIR proxy base URL (server-side, used by API route handlers). */
export const EHR_FHIR_BASE_URL = process.env.EHR_FHIR_BASE_URL ?? "http://localhost:4001/api/fhir";

/** EHR application base URL (used to build return links after submit). */
export const EHR_BASE_URL = process.env.EHR_BASE_URL ?? "http://localhost:4001";
