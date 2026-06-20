import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDomainLabels } from "@/lib/domain-label";
import type { AnswerRow, SessionQuestionRow, SessionRow } from "@/lib/supabase/types";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

const VERDICT_STYLES: Record<string, string> = {
  pass: "bg-success/15 text-success border-success/30",
  borderline: "bg-warning/15 text-warning border-warning/30",
  fail: "bg-destructive/15 text-destructive border-destructive/30",
};

export default async function SessionSummaryPage({ params }: PageProps) {
  const { sessionId } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: session } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
  if (!session) notFound();
  const sessionRow = session as SessionRow;

  const domainLabels = await getDomainLabels(supabase, [sessionRow.domain_id]);
  const domain = domainLabels.get(sessionRow.domain_id);

  const { data: sessionQuestions } = await supabase
    .from("session_questions")
    .select("*")
    .eq("session_id", sessionId)
    .order("thread_position", { ascending: true });
  const sqRows = (sessionQuestions ?? []) as SessionQuestionRow[];

  const sqIds = sqRows.map((r) => r.id);
  const { data: answers } = sqIds.length
    ? await supabase.from("answers").select("*").in("session_question_id", sqIds)
    : { data: [] };
  const answerRows = (answers ?? []) as AnswerRow[];
  const answerBySq = new Map(answerRows.map((a) => [a.session_question_id, a]));

  const roots = sqRows.filter((r) => r.follow_up_depth === 0);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground capitalize">
            {sessionRow.level.replace("_", " ")} &middot;{" "}
            {domain?.name ?? sessionRow.interview_type.replace("_", " ")}
            {domain && !domain.isCustom ? ` · ${sessionRow.interview_type.replace("_", " ")}` : ""} &middot;{" "}
            {sessionRow.mode === "practice" ? "Practice" : sessionRow.mode.replace("mock_", "") + "m Mock"}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-semibold tabular-nums">{Math.round(sessionRow.overall_score ?? 0)}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
        </div>
        {sessionRow.verdict && (
          <Badge variant="outline" className={VERDICT_STYLES[sessionRow.verdict]}>
            {sessionRow.verdict === "pass" ? "Pass" : sessionRow.verdict === "borderline" ? "Borderline" : "Fail"}
          </Badge>
        )}
      </div>

      {sessionRow.summary && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-foreground">{sessionRow.summary.narrative}</p>
            {sessionRow.summary.strengths.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Strengths</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {sessionRow.summary.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {sessionRow.summary.weaknesses.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Weaknesses</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {sessionRow.summary.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Full Thread</h2>
        {roots.map((root) => {
          const followUps = sqRows.filter((r) => r.parent_session_question_id === root.id);
          const rootAnswer = answerBySq.get(root.id);
          return (
            <Card key={root.id}>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium flex-1 whitespace-pre-wrap">{root.prompt_text}</p>
                  {rootAnswer?.overall_score != null && (
                    <span className="text-sm font-semibold tabular-nums shrink-0">
                      {Math.round(rootAnswer.overall_score)}
                    </span>
                  )}
                </div>
                {followUps.map((fu) => {
                  const fuAnswer = answerBySq.get(fu.id);
                  return (
                    <div key={fu.id} className="flex items-start justify-between gap-2 pl-4 border-l border-border">
                      <p className="text-sm text-muted-foreground flex-1 whitespace-pre-wrap">
                        Follow-up {fu.follow_up_depth}: {fu.prompt_text}
                      </p>
                      {fuAnswer?.overall_score != null && (
                        <span className="text-sm tabular-nums text-muted-foreground shrink-0">
                          {Math.round(fuAnswer.overall_score)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <Button nativeButton={false} render={<Link href="/interview/new" />}>Start Another Interview</Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/sessions" />}>
          View All Sessions
        </Button>
      </div>
    </div>
  );
}
