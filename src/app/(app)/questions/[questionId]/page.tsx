import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getQuestionById } from "@/actions/question.actions";
import { StartInterviewButton } from "./start-interview-button";
import { BackButton } from "@/components/back-button";

interface PageProps {
  params: Promise<{ questionId: string }>;
}

export default async function QuestionDetailPage({ params }: PageProps) {
  const { questionId } = await params;
  const question = await getQuestionById(questionId);
  if (!question) notFound();

  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-4xl mx-auto w-full">
      <BackButton />

      <div className="flex items-center gap-2">
        <Badge variant="secondary">{question.category}</Badge>
        <Badge variant="outline" className="capitalize">
          {question.level.replace("_", " ")}
        </Badge>
        <Badge variant="outline">Difficulty {question.difficulty}</Badge>
      </div>

      <p className="text-lg leading-relaxed text-foreground whitespace-pre-wrap">{question.prompt}</p>

      <StartInterviewButton questionId={question.id} />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Expected Answer Areas</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {question.expectedAnswerAreas.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>

          {question.commonMistakes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Common Mistakes</p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {question.commonMistakes.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Scoring Rubric</p>
            <dl className="flex flex-col gap-1.5">
              {Object.entries(question.scoringRubric).map(([dim, desc]) => (
                <div key={dim}>
                  <dt className="text-sm font-medium capitalize text-foreground">{dim}</dt>
                  <dd className="text-sm text-muted-foreground">{desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
