// Backward-compatible SMART endpoint alias. Keep one token implementation so
// every authorization code is consumed by the store that issued it.
export { OPTIONS, POST } from "../api/auth/token/route";
