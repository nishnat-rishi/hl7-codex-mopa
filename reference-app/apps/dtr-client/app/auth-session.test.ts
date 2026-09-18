import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DTR_STATE_COOKIE, DTR_TOKEN_COOKIE, DTR_VERIFIER_COOKIE } from "../lib/smart-config";
import { POST as submit } from "./api/submit/route";
import { GET as callback } from "./callback/route";
import { GET as launch } from "./launch/route";

const originalBypass = process.env.SMART_AUTH_BYPASS;

afterEach(() => {
  if (originalBypass === undefined) delete process.env.SMART_AUTH_BYPASS;
  else process.env.SMART_AUTH_BYPASS = originalBypass;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("DTR SMART session", () => {
  it("uses DTR-specific cookies for a launch on a shared localhost cookie jar", async () => {
    process.env.SMART_AUTH_BYPASS = "true";

    const response = await launch(
      new NextRequest(
        "http://localhost:4004/launch?iss=http://localhost:4001/api/fhir&launch=patient/sandra-chen"
      )
    );

    expect(response.headers.getSetCookie().join("\n")).toContain(`${DTR_TOKEN_COOKIE}=`);
  });

  it("does not exchange a code when generic SMART cookies clobber the DTR session", async () => {
    process.env.SMART_AUTH_BYPASS = "false";

    const response = await callback(
      new NextRequest("http://localhost:4004/callback?code=code-123&state=state-123", {
        headers: { cookie: "smart_state=state-123; smart_verifier=verifier" },
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "State mismatch" });
  });

  it("completes a callback using the DTR session after other localhost SMART cookies exist", async () => {
    process.env.SMART_AUTH_BYPASS = "false";
    const state = "state-123";
    const savedState = Buffer.from(JSON.stringify({ state, appContext: "{}" })).toString(
      "base64url"
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "dtr-access-token",
          token_type: "Bearer",
          expires_in: 3600,
          scope: "launch/patient patient/*.read",
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await callback(
      new NextRequest(`http://localhost:4004/callback?code=code-123&state=${state}`, {
        headers: {
          cookie: [
            "smart_state=clobbered-by-another-app",
            "smart_verifier=other-app-verifier",
            `${DTR_STATE_COOKIE}=${encodeURIComponent(savedState)}`,
            `${DTR_VERIFIER_COOKIE}=dtr-verifier`,
          ].join("; "),
        },
      })
    );

    expect(response.headers.get("location")).toBe("http://localhost:4004/?appContext=%7B%7D");
    expect(response.headers.getSetCookie().join("\n")).toContain(
      `${DTR_TOKEN_COOKIE}=dtr-access-token`
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("uses the DTR token for authenticated FHIR write-back", async () => {
    process.env.SMART_AUTH_BYPASS = "false";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "observation-1" }), { status: 201 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "questionnaire-response-1" }), { status: 201 })
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await submit(
      new NextRequest("http://localhost:4004/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `smart_token=other-app-token; ${DTR_TOKEN_COOKIE}=dtr-access-token`,
        },
        body: JSON.stringify({
          patientId: "jane-smith",
          answers: {
            her2: {
              system: "http://snomed.info/sct",
              code: "10828004",
              display: "Positive (IHC 3+)",
            },
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, options] of fetchMock.mock.calls) {
      expect((options as RequestInit).headers).toMatchObject({
        Authorization: "Bearer dtr-access-token",
      });
    }
  });
});
