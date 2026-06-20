import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CodeReviewResult } from "@/types/domain";

interface CodeReviewPanelProps {
  review: CodeReviewResult;
}

function FindingList({ items, marker, markerClass }: { items: string[]; marker: string; markerClass: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">None spotted on this read-through.</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5 text-sm text-foreground">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className={`mt-0.5 ${markerClass}`}>{marker}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function CodeReviewPanel({ review }: CodeReviewPanelProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-warning">
            Not executed
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            This is a static, read-through review by AI - your code was not compiled or run.
            Treat findings as a senior engineer&apos;s read of the code, not test results.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Badge variant="outline" className="w-fit text-primary border-primary/30">
            AI Code Review
          </Badge>
          <p className="text-base leading-relaxed text-foreground">{review.overallAssessment}</p>
        </div>

        <div className="flex flex-col gap-3">
          <Badge variant="outline" className="w-fit text-warning border-warning/30">
            Static Analysis
          </Badge>
          <Accordion multiple className="w-full">
            <AccordionItem value="syntax">
              <AccordionTrigger>Syntax issues (best effort)</AccordionTrigger>
              <AccordionContent>
                <FindingList items={review.syntaxIssues} marker="✕" markerClass="text-destructive" />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="bugs">
              <AccordionTrigger>Possible bugs</AccordionTrigger>
              <AccordionContent>
                <FindingList items={review.bugs} marker="✕" markerClass="text-destructive" />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="performance">
              <AccordionTrigger>Performance concerns</AccordionTrigger>
              <AccordionContent>
                <FindingList items={review.performanceConcerns} marker="→" markerClass="text-warning" />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="security">
              <AccordionTrigger>Security concerns</AccordionTrigger>
              <AccordionContent>
                <FindingList items={review.securityConcerns} marker="→" markerClass="text-warning" />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="maintainability">
              <AccordionTrigger>Maintainability</AccordionTrigger>
              <AccordionContent>
                <FindingList items={review.maintainabilityFeedback} marker="•" markerClass="text-muted-foreground" />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="quality">
              <AccordionTrigger>Code quality notes</AccordionTrigger>
              <AccordionContent>
                <FindingList items={review.codeQualityNotes} marker="•" markerClass="text-muted-foreground" />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="flex flex-col gap-3">
          <Badge variant="outline" className="w-fit text-success border-success/30">
            Interview Evaluation
          </Badge>
          <div className="flex flex-col gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3.5">
            <p className="text-base leading-relaxed text-foreground">{review.interviewerFeedback}</p>
          </div>
          <Accordion multiple className="w-full">
            <AccordionItem value="improvements">
              <AccordionTrigger>Suggested improvements</AccordionTrigger>
              <AccordionContent>
                <FindingList items={review.suggestedImprovements} marker="✓" markerClass="text-success" />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="optimized">
              <AccordionTrigger>Example optimized solution</AccordionTrigger>
              <AccordionContent>
                <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-sm text-foreground whitespace-pre-wrap">
                  {review.exampleOptimizedSolution}
                </pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}
