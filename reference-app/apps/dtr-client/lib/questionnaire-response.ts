import type { QItem, QuestionnaireAnswer } from "./questionnaire-gen";
import { ITEM_DEFINITIONS } from "./questionnaire-gen";

export function buildQuestionnaireResponse(
  patientId: string,
  answers: Record<string, QuestionnaireAnswer>,
  items: QItem[],
  date: string,
  questionnaireCanonical?: string
) {
  const itemDefinitions = new Map(items.map((item) => [item.linkId, item]));
  return {
    resourceType: "QuestionnaireResponse",
    ...(questionnaireCanonical ? { questionnaire: questionnaireCanonical } : {}),
    status: "completed",
    subject: { reference: `Patient/${patientId}` },
    authored: date,
    item: Object.entries(answers).map(([linkId, answer]) => {
      const item = itemDefinitions.get(linkId) ?? ITEM_DEFINITIONS[linkId];
      return {
        linkId,
        text: item?.text ?? linkId,
        answer: [typeof answer === "string" ? { valueString: answer } : { valueCoding: answer }],
      };
    }),
  };
}
