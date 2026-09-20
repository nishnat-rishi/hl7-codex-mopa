import { type NextRequest, NextResponse } from "next/server";
import { savePartnerDtrPackage } from "../../../lib/dtr-package-store";
import { buildPartnerDtrPackage, isPartnerDtrConfigured } from "../../../lib/partner-crd";

export async function POST(request: NextRequest) {
  if (!isPartnerDtrConfigured()) {
    return NextResponse.json({ error: "partner_dtr_not_configured" }, { status: 503 });
  }
  let body: {
    contextId?: unknown;
    patientId?: unknown;
    orders?: unknown;
    questionnaireCanonical?: unknown;
    coverageReference?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (
    typeof body.contextId !== "string" ||
    typeof body.patientId !== "string" ||
    typeof body.questionnaireCanonical !== "string" ||
    !Array.isArray(body.orders) ||
    body.orders.length === 0 ||
    body.orders.some((order) => !order || typeof order !== "object")
  ) {
    return NextResponse.json({ error: "invalid_dtr_context" }, { status: 400 });
  }

  try {
    const payload = await buildPartnerDtrPackage({
      contextId: body.contextId,
      patientId: body.patientId,
      orders: body.orders as Record<string, unknown>[],
      questionnaireCanonical: body.questionnaireCanonical,
      coverageReference:
        typeof body.coverageReference === "string" ? body.coverageReference : undefined,
    });
    const packageId = await savePartnerDtrPackage(payload, body.patientId);
    return NextResponse.json({ packageId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "partner_dtr_package_failed" },
      { status: 502 }
    );
  }
}
