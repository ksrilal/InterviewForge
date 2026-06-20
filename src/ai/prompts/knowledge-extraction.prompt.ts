import { buildPersonaPreamble } from "./interviewer.prompt";

// Defensive cap, not a chunking strategy - resumes/JDs/notes are short
// enough that this rarely triggers; it exists to keep a pathological upload
// from blowing up token usage in one call.
const MAX_SOURCE_CHARS = 20000;

export interface KnowledgeExtractionPromptInput {
  domainName: string;
  domainDescription?: string;
  sourceText: string;
  isCustomDomain: boolean;
}

export function buildKnowledgeExtractionPrompt(input: KnowledgeExtractionPromptInput): {
  system: string;
  user: string;
} {
  const { domainName, domainDescription, sourceText, isCustomDomain } = input;
  const truncatedText = sourceText.slice(0, MAX_SOURCE_CHARS);

  // The fixed interviewTypes/skillAxes vocabulary below (backend, devops,
  // architecture, ...) is Software-Engineering-specific. It's correct for
  // the global SE domain's own knowledge base, but forcing it onto an
  // unrelated custom domain ("pick the closest fit even if imperfect") is
  // exactly what produced meaningless filters and a radar full of
  // "Not enough history" for things like an Interior Design domain - so
  // custom domains get their own instructions instead.
  const taxonomyInstructions = isCustomDomain
    ? `"interviewTypes": [] (leave empty - this categorization doesn't apply outside Software Engineering),
  "skillAxes": string[] (invent 3-6 short, Title Case skill category labels that genuinely describe the skills THIS domain's questions assess, e.g. for an Interior Design domain: "Space Planning", "Client Communication", "Material Selection". Reuse the exact same label spelling consistently across every question it applies to - do not invent a slightly different variant per question),`
    : `"interviewTypes": string[] (one or more of: backend, full_stack, dotnet, architecture, system_design, cloud, devops, behavioral, ai - pick the closest fit even if imperfect),
  "skillAxes": string[] (one or more of: architecture, system_design, databases, security, backend, cloud, devops, leadership, communication, ai),`;

  const system = `${buildPersonaPreamble("professional")}

You are building an interview question bank from a candidate-provided document (resume, job
description, notes, or a technology list) for an interview domain called "${domainName}".
Read the content and identify the real skills, technologies, and experience areas it implies,
then generate a categorized set of interview questions covering them - not generic textbook
questions, ones grounded in what this specific document actually contains.`;

  const user = `Domain name: ${domainName}
${domainDescription ? `Domain description: ${domainDescription}\n` : ""}
Source content:
"""
${truncatedText}
"""

Generate 6-10 interview questions spanning multiple categories and question types found in this
content (mix theory/scenario/debugging/architecture/system_design/behavioral as appropriate -
don't force a type that doesn't fit). Infer a reasonable target interview level per question from
the content's apparent seniority (e.g. years of experience, scope of responsibility described).

Respond with a JSON object matching this exact shape (no markdown, no commentary outside the JSON):
{
  "questions": [
    {
      "category": string,
      "topic": string,
      "questionType": "theory" | "scenario" | "debugging" | "architecture" | "system_design" | "behavioral",
      "difficulty": number (1-5),
      "level": "junior" | "mid" | "senior" | "staff" | "tech_lead",
      ${taxonomyInstructions}
      "prompt": string,
      "expectedAnswerAreas": string[],
      "commonMistakes": string[],
      "followUpSeeds": string[],
      "scoringRubric": { "accuracy": string, "depth": string, "completeness": string, "practicality": string, "communication": string, "seniority": string }
    }
  ]
}`;

  return { system, user };
}
