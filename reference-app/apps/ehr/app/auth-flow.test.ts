import { generateCodeChallenge, generateCodeVerifier } from "@mopa/smart-auth";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as rootDiscovery } from "./.well-known/smart-configuration/route";
import { GET as rootAuthorize } from "./authorize/route";
import { POST as rootToken } from "./token/route";

describe("root SMART endpoint compatibility", () => {
  it("advertises the canonical API authorization and token endpoints", async () => {
    const response = rootDiscovery();
    const configuration = (await response.json()) as Record<string, string>;

    expect(configuration.issuer).toBe("http://localhost:4001");
    expect(configuration.authorization_endpoint).toBe("http://localhost:4001/api/auth/authorize");
    expect(configuration.token_endpoint).toBe("http://localhost:4001/api/auth/token");
  });

  it("uses the same authorization-code store through the root compatibility aliases", async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const redirectUri = "http://localhost:4002/callback";

    const authorizeResponse = await rootAuthorize(
      new NextRequest(
        `http://localhost:4001/authorize?response_type=code&client_id=mopa-smart-app&redirect_uri=${encodeURIComponent(redirectUri)}&state=state-123&code_challenge=${challenge}&code_challenge_method=S256&launch=patient/jane-smith`
      )
    );

    expect(authorizeResponse.status).toBe(307);
    expect(authorizeResponse.headers.get("set-cookie")).toBeNull();
    const callbackUrl = new URL(authorizeResponse.headers.get("location") ?? "");
    const code = callbackUrl.searchParams.get("code");
    expect(code).toMatch(/^[a-f0-9]{32}$/);
    expect(callbackUrl.searchParams.get("state")).toBe("state-123");

    const tokenResponse = await rootToken(
      new NextRequest("http://localhost:4001/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code ?? "",
          redirect_uri: redirectUri,
          client_id: "mopa-smart-app",
          code_verifier: verifier,
        }).toString(),
      })
    );

    expect(tokenResponse.status).toBe(200);
    await expect(tokenResponse.json()).resolves.toMatchObject({
      token_type: "Bearer",
      patient: "jane-smith",
    });
  });

  it("does not let another client redeem a code with the same redirect URI", async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const redirectUri = "http://localhost:4002/callback";

    const authorizeResponse = await rootAuthorize(
      new NextRequest(
        `http://localhost:4001/authorize?response_type=code&client_id=mopa-smart-app&redirect_uri=${encodeURIComponent(redirectUri)}&state=state-456&code_challenge=${challenge}&code_challenge_method=S256&launch=patient/jane-smith`
      )
    );
    const code = new URL(authorizeResponse.headers.get("location") ?? "").searchParams.get("code");

    const attackerResponse = await rootToken(
      new NextRequest("http://localhost:4001/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code ?? "",
          redirect_uri: redirectUri,
          client_id: "mopa-dtr-client",
          code_verifier: verifier,
        }).toString(),
      })
    );

    expect(attackerResponse.status).toBe(400);
    await expect(attackerResponse.json()).resolves.toMatchObject({ error: "invalid_grant" });

    const ownerResponse = await rootToken(
      new NextRequest("http://localhost:4001/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code ?? "",
          redirect_uri: redirectUri,
          client_id: "mopa-smart-app",
          code_verifier: verifier,
        }).toString(),
      })
    );

    expect(ownerResponse.status).toBe(200);
  });
});
