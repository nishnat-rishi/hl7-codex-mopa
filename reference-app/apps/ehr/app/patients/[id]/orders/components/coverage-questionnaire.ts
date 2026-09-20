import type { CdsAction } from "@mopa/cds-hooks";

const COVERAGE_INFORMATION_URL =
  "http://hl7.org/fhir/us/davinci-crd/StructureDefinition/ext-coverage-information";

export interface CoverageQuestionnaire {
  canonical: string;
  contextId: string;
  coverageReference?: string;
  order: Record<string, unknown>;
}

type FhirExtension = {
  url?: unknown;
  valueCanonical?: unknown;
  valueString?: unknown;
  valueReference?: { reference?: unknown };
  extension?: unknown;
};

function isExtension(value: unknown): value is FhirExtension {
  return Boolean(value && typeof value === "object");
}

/**
 * Extract the partner-selected DTR questionnaire from CRD coverage information.
 * A coverage assertion id is required because DTR $questionnaire-package uses it
 * to recover the partner's processing context.
 */
export function findCoverageQuestionnaire(
  actions: CdsAction[] | undefined
): CoverageQuestionnaire | undefined {
  for (const action of actions ?? []) {
    if (!action.resource || typeof action.resource !== "object") continue;
    const order = action.resource as Record<string, unknown>;
    const extensions = Array.isArray(order.extension) ? order.extension : [];
    for (const candidate of extensions) {
      if (!isExtension(candidate) || candidate.url !== COVERAGE_INFORMATION_URL) continue;
      const children = Array.isArray(candidate.extension) ? candidate.extension : [];
      const canonical = children.find(
        (child): child is FhirExtension =>
          isExtension(child) &&
          child.url === "questionnaire" &&
          typeof child.valueCanonical === "string"
      )?.valueCanonical;
      const contextId = children.find(
        (child): child is FhirExtension =>
          isExtension(child) &&
          child.url === "coverage-assertion-id" &&
          typeof child.valueString === "string"
      )?.valueString;
      const coverageReference = children.find(
        (child): child is FhirExtension =>
          isExtension(child) &&
          child.url === "coverage" &&
          typeof child.valueReference?.reference === "string"
      )?.valueReference?.reference;
      if (typeof canonical === "string" && typeof contextId === "string") {
        return {
          canonical,
          contextId,
          coverageReference: typeof coverageReference === "string" ? coverageReference : undefined,
          order,
        };
      }
    }
  }
  return undefined;
}
