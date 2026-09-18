import { buildSmartConfiguration } from "@mopa/smart-auth";
import { NextResponse } from "next/server";

const EHR_ISSUER = process.env.NEXT_PUBLIC_EHR_BASE_URL ?? "http://localhost:4001";

export function GET() {
  const configuration = buildSmartConfiguration(EHR_ISSUER);

  // Keep the legacy root issuer usable, but direct it to the one canonical
  // authorization-code implementation. The client callbacks exchange against
  // /api/auth/token, so advertising the older /authorize and /token handlers
  // here sent a root-issuer launch through a different, incompatible flow.
  return NextResponse.json(
    {
      ...configuration,
      authorization_endpoint: `${EHR_ISSUER.replace(/\/$/, "")}/api/auth/authorize`,
      token_endpoint: `${EHR_ISSUER.replace(/\/$/, "")}/api/auth/token`,
    },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}
