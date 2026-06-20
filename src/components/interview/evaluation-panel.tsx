import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreBar } from "./score-bar";
import type { Evaluation } from "@/types/domain";
import { cn } from "@/lib/utils";

interface EvaluationPanelProps {
  evaluation: Evaluation;
}

function overallScoreColorClass(score: number): string {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-destructive";
}

// A short, honest headline alongside the raw number - framing this as
// "where you are on the path", not just a bare grade, since the goal of
// this app is to keep someone training, not to make a single answer feel
// like a final verdict.
function scoreHeadline(score: number): string {
  if (score >= 85) return "Excellent answer";
  if (score >= 70) return "Solid answer";
  if (score >= 50) return "Good progress, keep building";
  if (score >= 25) return "Partial - some real gaps to close";
  return "Needs real rework";
}

export function EvaluationPanel({ evaluation }: EvaluationPanelProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-4xl font-semibold tabular-nums",
                overallScoreColorClass(evaluation.overallScore)
              )}
            >
              {Math.round(evaluation.overallScore)}
            </span>
            <span className="text-base text-muted-foreground">/ 100</span>
          </div>
          <p className={cn("text-sm font-medium", overallScoreColorClass(evaluation.overallScore))}>
            {scoreHeadline(evaluation.overallScore)}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <ScoreBar label="Accuracy" score={evaluation.dimensions.accuracy} />
          <ScoreBar label="Depth" score={evaluation.dimensions.depth} />
          <ScoreBar label="Completeness" score={evaluation.dimensions.completeness} />
          <ScoreBar label="Practicality" score={evaluation.dimensions.practicality} />
          <ScoreBar label="Communication" score={evaluation.dimensions.communication} />
          <ScoreBar label="Seniority" score={evaluation.dimensions.seniority} />
        </div>

        <div className="flex flex-col gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Interviewer feedback
          </p>
          <p className="text-base leading-relaxed text-foreground">
            {evaluation.interviewerFeedback}
          </p>
        </div>

        <Accordion multiple className="w-full">
          {evaluation.strengths.length > 0 && (
            <AccordionItem value="strengths">
              <AccordionTrigger>What worked well</AccordionTrigger>
              <AccordionContent>
                <ul className="flex flex-col gap-1.5 text-sm text-foreground">
                  {evaluation.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-success">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}
          {evaluation.weaknesses.length > 0 && (
            <AccordionItem value="weaknesses">
              <AccordionTrigger>Where to improve</AccordionTrigger>
              <AccordionContent>
                <ul className="flex flex-col gap-1.5 text-sm text-foreground">
                  {evaluation.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-warning">→</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}
          {evaluation.missingConcepts.length > 0 && (
            <AccordionItem value="missing">
              <AccordionTrigger>Concepts to study next</AccordionTrigger>
              <AccordionContent>
                <ul className="flex flex-col gap-1.5 text-sm text-foreground">
                  {evaluation.missingConcepts.map((m, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-muted-foreground">•</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}
          <AccordionItem value="suggested">
            <AccordionTrigger>What a strong answer looks like</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {evaluation.suggestedAnswer}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
