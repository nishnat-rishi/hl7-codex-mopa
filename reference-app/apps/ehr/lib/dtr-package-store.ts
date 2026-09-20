const PACKAGE_TTL_MS = 5 * 60_000;
const EXPIRY_TAG_SYSTEM = "http://mopa.example/fhir/CodeSystem/dtr-package-expiry";

function fhirBaseUrl(): string {
  return (process.env.FHIR_BASE_URL ?? "http://localhost:8080/fhir").replace(/\/$/, "");
}

export async function savePartnerDtrPackage(
  payload: Record<string, unknown>,
  patientId: string
): Promise<string> {
  const packageId = crypto.randomUUID();
  const response = await fetch(`${fhirBaseUrl()}/Binary/${packageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/fhir+json" },
    body: JSON.stringify({
      resourceType: "Binary",
      id: packageId,
      contentType: "application/fhir+json",
      securityContext: { reference: `Patient/${patientId}` },
      // Binary is not a DomainResource, so use a meta tag rather than an
      // extension to retain the five-minute expiry in HAPI FHIR.
      meta: {
        tag: [
          {
            system: EXPIRY_TAG_SYSTEM,
            code: new Date(Date.now() + PACKAGE_TTL_MS).toISOString(),
          },
        ],
      },
      data: Buffer.from(JSON.stringify(payload)).toString("base64"),
    }),
  });
  if (!response.ok) throw new Error(`DTR package store failed: HTTP ${response.status}`);
  return packageId;
}

export async function takePartnerDtrPackage(
  packageId: string
): Promise<Record<string, unknown> | undefined> {
  const response = await fetch(`${fhirBaseUrl()}/Binary/${encodeURIComponent(packageId)}`, {
    headers: { Accept: "application/fhir+json" },
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`DTR package lookup failed: HTTP ${response.status}`);
  const binary = (await response.json()) as {
    data?: unknown;
    meta?: { tag?: Array<{ system?: unknown; code?: unknown }> };
  };
  const expiresAt = binary.meta?.tag?.find((tag) => tag.system === EXPIRY_TAG_SYSTEM)?.code;
  if (typeof expiresAt !== "string" || Date.parse(expiresAt) <= Date.now()) return undefined;
  if (typeof binary.data !== "string") return undefined;
  try {
    const payload = JSON.parse(Buffer.from(binary.data, "base64").toString("utf8"));
    return payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}
