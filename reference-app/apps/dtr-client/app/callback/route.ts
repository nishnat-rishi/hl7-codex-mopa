import { exchangeCode, parseCookies, serializeCookie } from "@mopa/smart-auth";
import { type NextRequest, NextResponse } from "next/server";

import {
  DTR_STATE_COOKIE,
  DTR_TOKEN_COOKIE,
  DTR_VERIFIER_COOKIE,
  SMART_CLIENT_ID,
  SMART_REDIRECT_URI,
  TOKEN_ENDPOINT,
} from "../../lib/smart-config";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json(
      { error, description: searchParams.get("error_description") },
      { status: 400 }
    );
  }
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const cookies = parseCookies(request.headers.get("cookie"));
  const savedStateRaw = cookies[DTR_STATE_COOKIE];

  // Decode state payload (includes appContext + returnRegimen carried through the OAuth round-trip)
  let appContext: string | undefined;
  let returnRegimen: string | undefined;
  let packageId: string | undefined;

  interface StatePayload {
    state: string;
    appContext?: string;
    returnRegimen?: string;
    packageId?: string;
  }

  if (!savedStateRaw) {
    return NextResponse.json({ error: "State mismatch" }, { status: 400 });
  }

  try {
    const payload = JSON.parse(
      Buffer.from(savedStateRaw, "base64url").toString("utf-8")
    ) as StatePayload;
    if (payload.state !== state) {
      return NextResponse.json({ error: "State mismatch" }, { status: 400 });
    }
    appContext = payload.appContext;
    returnRegimen = payload.returnRegimen;
    packageId = payload.packageId;
  } catch {
    return NextResponse.json({ error: "State mismatch" }, { status: 400 });
  }

  const verifier = cookies[DTR_VERIFIER_COOKIE];
  if (!verifier) {
    return NextResponse.json({ error: "Missing PKCE verifier" }, { status: 400 });
  }

  const tokenResponse = await exchangeCode(TOKEN_ENDPOINT, code, verifier, {
    clientId: SMART_CLIENT_ID,
    redirectUri: SMART_REDIRECT_URI,
  });

  const homeUrl = new URL("/", request.url);
  if (appContext) homeUrl.searchParams.set("appContext", appContext);
  if (returnRegimen) homeUrl.searchParams.set("returnRegimen", returnRegimen);
  if (packageId) homeUrl.searchParams.set("packageId", packageId);

  const response = NextResponse.redirect(homeUrl);
  response.headers.append(
    "Set-Cookie",
    serializeCookie(DTR_TOKEN_COOKIE, tokenResponse.access_token, {
      maxAge: tokenResponse.expires_in,
    })
  );
  response.headers.append("Set-Cookie", serializeCookie(DTR_VERIFIER_COOKIE, "", { maxAge: 0 }));
  response.headers.append("Set-Cookie", serializeCookie(DTR_STATE_COOKIE, "", { maxAge: 0 }));
  return response;
}
