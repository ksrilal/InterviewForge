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

export function EvaluationPanel({ evaluation }: EvaluationPanelProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-3xl font-semibold tabular-nums", overallScoreColorClass(evaluation.overallScore))}>
            {Math.round(evaluation.overallScore)}
          </span>
          <span className="text-sm text-muted-foreground">/ 100</span>
        </div>

        <div className="flex flex-col gap-2">
          <ScoreBar label="Accuracy" score={evaluation.dimensions.accuracy} />
          <ScoreBar label="Depth" score={evaluation.dimensions.depth} />
          <ScoreBar label="Completeness" score={evaluation.dimensions.completeness} />
          <ScoreBar label="Practicality" score={evaluation.dimensions.practicality} />
          <ScoreBar label="Communication" score={evaluation.dimensions.communication} />
          <ScoreBar label="Seniority" score={evaluation.dimensions.seniority} />
        </div>

        <blockquote className="rounded-md border-l-2 border-primary bg-accent/40 px-4 py-3 text-sm italic text-foreground">
          &ldquo;{evaluation.interviewerFeedback}&rdquo;
        </blockquote>

        <Accordion multiple className="w-full">
          {evaluation.strengths.length > 0 && (
            <AccordionItem value="strengths">
              <AccordionTrigger>Strengths</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {evaluation.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}
          {evaluation.weaknesses.length > 0 && (
            <AccordionItem value="weaknesses">
              <AccordionTrigger>Weaknesses</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {evaluation.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}
          {evaluation.missingConcepts.length > 0 && (
            <AccordionItem value="missing">
              <AccordionTrigger>Missing Concepts</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {evaluation.missingConcepts.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}
          <AccordionItem value="suggested">
            <AccordionTrigger>Suggested Answer</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {evaluation.suggestedAnswer}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
