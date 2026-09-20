import { NextResponse } from "next/server";
import { takePartnerDtrPackage } from "../../../../lib/dtr-package-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ packageId: string }> }
) {
  const { packageId } = await params;
  const payload = await takePartnerDtrPackage(packageId);
  if (!payload) return NextResponse.json({ error: "dtr_package_not_found" }, { status: 404 });
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
