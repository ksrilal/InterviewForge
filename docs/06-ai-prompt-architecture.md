# AI Prompt Architecture

## Provider abstraction

```ts
// src/ai/provider.ts
export interface AIProvider {
  generateQuestion(input: GenerateQuestionInput): Promise<GeneratedQuestion>;
  evaluateAnswer(input: EvaluateAnswerInput): Promise<Evaluation>;
  decideFollowUp(input: FollowUpDecisionInput): Promise<FollowUpDecision>;
  generateTrainingPlan(input: TrainingPlanInput): Promise<TrainingPlan>;
}

export function getAIProvider(): AIProvider {
  const active = process.env.ACTIVE_AI_PROVIDER; // 'anthropic' | 'openai'
  if (active === 'openai') return new OpenAIProvider();
  return new AnthropicProvider(); // default
}
```

Every Server Action calls `getAIProvider()` — nothing else in the app imports `@anthropic-ai/sdk` or `openai` directly. Swapping providers is an env var change, not a code change. This is the "thin unified interface" decision: two concrete classes, one factory, no registry/plugin system.

### Env vars

```
ACTIVE_AI_PROVIDER=anthropic        # or "openai"
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-6   # keep model name in env, not hardcoded — model upgrades shouldn't need a deploy of code logic
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1
```

### Response contract enforcement

Both providers are asked for structured output (Anthropic: tool-use forced-call; OpenAI: `response_format: json_schema`) validated against the **same Zod schema** in `ai/schemas/ai-response.schemas.ts` before the Server Action ever sees it. If validation fails, retry once with a "your last response didn't match the schema, here it is again, fix it" repair prompt; if that fails too, surface `evaluation_error` per [01-prd.md](01-prd.md) §7 — never pass unvalidated AI output into the DB or UI.

```ts
export const EvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  dimensions: z.object({
    accuracy: z.number().min(0).max(100),
    depth: z.number().min(0).max(100),
    completeness: z.number().min(0).max(100),
    practicality: z.number().min(0).max(100),
    communication: z.number().min(0).max(100),
    seniority: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missingConcepts: z.array(z.string()),
  suggestedAnswer: z.string(),
  interviewerFeedback: z.string(),
});
```

## Prompt design principles

1. **The rubric is always verbatim, never paraphrased.** The question's `scoring_rubric` JSONB column is interpolated directly into the evaluation prompt. The AI is not asked to "use good judgment" about what a senior answer looks like — it's given the exact band descriptions written for that question.
2. **Score anchoring.** Every evaluation prompt includes explicit 0–100 band guidance so scores are comparable session-to-session:
   - 90–100: Staff/Tech-Lead-level mastery — correct, deep, articulates tradeoffs unprompted.
   - 70–89: Solid Senior-level answer — correct and reasonably complete, may miss one nuance.
   - 50–69: Mid-level — correct core concept, lacks depth/tradeoff awareness.
   - 25–49: Partial/confused — some correct fragments, notable gaps or inaccuracies.
   - 0–24: Incorrect, off-topic, or no real attempt.
3. **The interviewer persona is consistent across modules.** One shared system prompt fragment (`PERSONA_PREAMBLE` in `prompts/interviewer.prompt.ts`) describes the interviewer character — pragmatic, slightly skeptical, probing but not hostile, calibrated to the selected level — reused by the question-generation, follow-up, and evaluation prompts so the "voice" doesn't drift between modules.
4. **Conversation history is summarized, not replayed in full, past a depth threshold.** For a follow-up at depth 3, replaying the full text of the original question + all prior answers is wasteful. Beyond depth 1, prior turns are passed as a compact `{question, score, oneLineGap}` array rather than full transcripts — keeps token cost and latency down without losing the context the follow-up decision needs.

## Prompt templates (by module)

### Module 1/4 — Opening question + follow-up decision

```
SYSTEM: {PERSONA_PREAMBLE}
You are interviewing a candidate for a {level} {interviewType} role.

USER (follow-up decision call):
Original question: "{rootQuestion.prompt}"
Expected answer areas: {rootQuestion.expectedAnswerAreas}
Candidate's answer: "{answer.text}"
Evaluation just produced: overall={evaluation.overallScore}, gaps={evaluation.missingConcepts}
Follow-ups already asked this thread: {followUpCount} / 3 max
Follow-up seeds available: {rootQuestion.followUpSeeds}

Decide ONE of: ASK_FOLLOW_UP | NEW_TOPIC | END_SESSION
If ASK_FOLLOW_UP: escalate depth using definition → reasoning → applied → edge-case progression.
Respond using the FollowUpDecision schema.
```

### Module 3 — Evaluation

```
SYSTEM: {PERSONA_PREAMBLE}
You are scoring a candidate's interview answer. Be exacting — most real interviewers
overrate politely; you must not. Use the rubric and score bands below verbatim.

Question: "{question.prompt}"
Question type: {question.type} | Difficulty: {question.difficulty} | Target level: {question.level}
Scoring rubric (verbatim, per-dimension): {question.scoringRubric}
Score bands: {SCORE_BAND_GUIDANCE}
Common mistakes seen at this question: {question.commonMistakes}

Candidate's answer: "{answer.text}"

Respond using the Evaluation schema. `suggestedAnswer` should model what a strong
{question.level} answer looks like, not a generic textbook definition.
```

### Module 2 — Question generation (on-demand bank growth)

```
SYSTEM: {PERSONA_PREAMBLE}
Generate ONE new interview question for: level={level}, interviewType={type},
questionType={questionType}, topic area={topic if user specified, else "your choice within scope"}.
It must be answerable in 1-3 minutes of spoken explanation (no take-home-sized scope).
Avoid duplicating the spirit of these existing prompts: {recentPromptTitles[]}
Respond using the GeneratedQuestion schema (same shape as the `questions` table columns).
```
Generated questions are persisted with `source = 'ai_generated'` so the bank's provenance stays auditable, and a lightweight duplicate-check (topic + first-50-chars similarity) runs before insert.

### Module 7 — Training plan

```
SYSTEM: {PERSONA_PREAMBLE} You are now acting as a prep coach, not an interviewer.
Skill snapshot (9 axes, rolling averages): {skillSnapshots}
Target level: {targetLevel} | Target interview date: {targetDate or "none given"}
Recent session verdicts: {last5Verdicts}

Identify the 2-3 weakest axes RELATIVE to what {targetLevel} interviews actually weight
(e.g. Staff weights Architecture/Leadership higher than Mid).
Produce a 7-day daily task list (concrete: "answer 3 questions on Caching", not "study caching")
and one weekly goal. If a target date is given, estimate readiness trajectory honestly —
do not inflate confidence.
Respond using the TrainingPlan schema.
```

## Cost control measures (ties to PRD §7)

- Follow-up cap: 3 per thread, enforced in code before the AI is even asked (not just prompted) — the Server Action refuses to call `decideFollowUp` past depth 3 and forces `NEW_TOPIC`.
- Session question cap by mode: practice = 8 root topics max, mock_15 = ~4, mock_30 = ~8, mock_60 = ~14 (tuned so average answer+evaluation latency fits the window).
- Model selection is env-driven specifically so a cheaper model can be used for question generation/follow-up routing (cheap, frequent, low-stakes decisions) versus a stronger model reserved for evaluation (the one call where quality matters most) — supported via two separate model env vars if desired later, but MVP keeps one model per provider for simplicity and can split later without a code change (just read a second env var in the factory).
