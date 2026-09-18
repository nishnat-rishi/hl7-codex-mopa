// Backward-compatible SMART endpoint alias. Keep one authorization-code
// implementation so root-issuer launches cannot diverge from discovery.
export { GET } from "../api/auth/authorize/route";
