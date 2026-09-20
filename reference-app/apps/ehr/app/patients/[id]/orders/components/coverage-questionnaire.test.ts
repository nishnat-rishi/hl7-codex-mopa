import { describe, expect, it } from "vitest";
import { findCoverageQuestionnaire } from "./coverage-questionnaire";

const coverageUrl =
  "http://hl7.org/fhir/us/davinci-crd/StructureDefinition/ext-coverage-information";

describe("findCoverageQuestionnaire", () => {
  it("uses the questionnaire and assertion id carried by CRD coverage information", () => {
    const result = findCoverageQuestionnaire([
      {
        type: "update",
        description: "coverage assertion",
        resource: {
          resourceType: "RequestGroup",
          extension: [
            {
              url: coverageUrl,
              extension: [
                {
                  url: "questionnaire",
                  valueCanonical: "https://partner.example/fhir/Questionnaire/oncology|1.0.0",
                },
                { url: "coverage-assertion-id", valueString: "context-123" },
                { url: "coverage", valueReference: { reference: "Coverage/coverage-123" } },
              ],
            },
          ],
        },
      },
    ]);

    expect(result).toMatchObject({
      canonical: "https://partner.example/fhir/Questionnaire/oncology|1.0.0",
      contextId: "context-123",
      coverageReference: "Coverage/coverage-123",
    });
  });

  it("does not replace a SMART fallback when the extension omits the questionnaire", () => {
    expect(
      findCoverageQuestionnaire([
        {
          type: "update",
          description: "coverage assertion",
          resource: {
            resourceType: "RequestGroup",
            extension: [
              { url: coverageUrl, extension: [{ url: "doc-needed", valueCode: "clinical" }] },
            ],
          },
        },
      ])
    ).toBeUndefined();
  });
});
